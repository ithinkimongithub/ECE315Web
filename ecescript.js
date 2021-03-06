"use strict";
// Author: Thomas Kubler, Maj, USAF
//  Department of Electrical and Computer Engineering, United States Air Force Academy
// JavaScript source code

/******************************************** PHYSICAL CONSTANTS ************************************************************************/
const SOL = 300000000; //speed of light will be 3x 10 ^8 m/s, per equation sheet
const FOURPI = 4*Math.PI;
const FOURPICUBE = 4*4*4*Math.PI*Math.PI*Math.PI;
const KMPERMILE = 1.61; //per equation sheet
const BOLTZ = 1.38*Math.pow(10,-23); //Boltzmann's constant 1.38*10^-23
const TWOPI = 2*Math.PI;
const PI = Math.PI;
//all distances are in meters
/******************************************** SCENARIO VARIABLES *********************************************************/
var freq;
var wavelength;
var friis_range;
var los_total;
var los_tx;
var los_rx;
var comm_range_viable;
var comm_snr_min;
var comm_snr_act;
var friis_p_r;
var friis_p_r_min;
var friis_p_t;
var friis_r_max;
var height_tx;
var height_rx;
var gain_tx;
var gain_rx;
var tx_antenna_type;
var tx_antenna_length;
var tx_antenna_radius;
var tx_antenna_eta;
var rx_antenna_type;
var rx_antenna_length;
var rx_antenna_radius;
var rx_antenna_eta;
var jammer_height;
var jammer_gain;
var jammer_range;
var jammer_power;
var thermal_bandwidth;
var thermal_temperature;
const minvertical = 0;
const maxvertical = 500000;
const mingain = 1;
const maxgain = Math.pow(10,12);
const minnorm = 1;
const maxnorm = 999;
const mindist = 1;
const maxdist = Math.pow(10,12);
const minRCS = Math.pow(10,-12);
const maxRCS = Math.pow(10, 12);
const minangle = -360;
const maxangle = 360;
const maxsamples = 2500;
var multiplier; //for remembering scale :(
var darkmode = false;
//********************************************  MATH *********************************************************/

function GetPolar(real,imag){
    var mag = Math.sqrt(real*real+imag*imag);
    var phi = Math.atan2(imag,real)*180/Math.PI;
    return [mag,phi];
}

const IOTA = Math.pow(10,-24);

function checkIota(input){
    if(Math.abs(input) < IOTA) return 0;
    return input;
}
/********************************************* WRITING FUNCTIONS *******************************************************/
function writeTripleString(value,units="",db=false,decade=true,dbprec=2){ //when in decade mode, only return 10^x
    var putinnegativesign = "";
    var absvalue = Math.abs(value);
    if(value < 0){
        putinnegativesign = "-"; 
    }
    var exp = Math.log10(absvalue);
    if(db){ //this will be dB for a Voltage ratio (hence the x 20)
        if(value <= 0) return "-inf";
        var dbresult = 20*Math.log10(value);
        return dbresult.toFixed(dbprec)+" dB";
    }
    else if(decade){
        var d_exp = Math.round(exp);
        return "10^"+d_exp.toFixed(0);
    }
    else{
        if(value == 0) return "0"+units;
        var precision = 4;
        var triplets = Math.round(exp/3.0-0.5);
        var t_exp = 3*triplets;
        var argument = absvalue / Math.pow(10,t_exp);
        var argstring = argument.toPrecision(precision);
        argument = parseFloat(argstring);
        //then check if argument is 1000 due to some precision in the log and rounding
        if(argument >= 1000){
            t_exp += 3;
            argument = absvalue / Math.pow(10,t_exp);
            argstring = argument.toPrecision(precision);
        }
        else if(argument < 1){
            t_exp -= 3;
            argument = absvalue / Math.pow(10,t_exp);
            argstring = argument.toPrecision(precision);
        }
        if(t_exp == 0){
            return putinnegativesign+argstring+units;
        }
        else{
            return putinnegativesign+argstring+"x"+"10^"+t_exp+units;
        }
    }
}
function writeTripleLatex(value,units="",makedoppler=false){
    if(value == 0) return "0"+units;
    var putinnegativesign = "";
    var absvalue = Math.abs(value);
    if(value < 0){
        putinnegativesign = "-"; 
    }
    var exp = Math.log(absvalue) / Math.log(10);
    var precision = 4;
    if(makedoppler == true) precision = exp + 1;
    var triplets = Math.round(exp/3.0-0.5);
    var t_exp = 3*triplets;
    var argument = absvalue / Math.pow(10,t_exp);
    var argstring = argument.toPrecision(precision);
    argument = parseFloat(argstring);
    //then check if argument is 1000 due to some precision in the log and rounding
    if(argument >= 1000){
        t_exp += 3;
        argument = absvalue / Math.pow(10,t_exp);
        argstring = argument.toPrecision(precision);
    }
    else if(argument < 1){
        t_exp -= 3;
        argument = absvalue / Math.pow(10,t_exp);
        argstring = argument.toPrecision(precision);
    }
    if(t_exp == 0){
        return putinnegativesign+argstring+units;
    }
    else{
        return putinnegativesign+argstring+"\\times "+"10^{"+t_exp+"}"+units;
    }
}

function writeRectangular(r,i){
    var complexsign = "+";
    if(i < 0)   complexsign = "-";
    var prefix = "";
    var suffix = "";
    if(i >= 1000 || i <= -1000){
        prefix = "(";
        suffix = ")";
    }
    return writeTripleLatex(r)+complexsign+"j"+prefix+writeTripleLatex(i)+suffix;
}

function writeEng(value, units, prependequals = false, forceoutput = false, dopplerfreq = false, outputnumber = true, outputunits = true){
    var absvalue = Math.abs(value);
    var sign = "";
    if(value < 0) sign = "-";
    var exp = 0;
    if(value != 0)
        exp = Math.log(absvalue) / Math.log(10);
    var triplets = Math.round(exp/3.0-0.5);
    var t_exp = 3*triplets;
    var argument = absvalue / Math.pow(10,t_exp);
    var roundedarg = argument.toPrecision(precision);
    if(roundedarg=="1000"){
        t_exp += 3;
        argument = absvalue / Math.pow(10,t_exp);
    }
    var prefix = " ";
    var precision = 4; //if going to millions of meters, increase precision to keep digits from turning into sci notation
    switch(t_exp){
        case -24:   prefix = "y";   break;
        case -21:   prefix = "z";   break;
        case -18:   prefix = "a";   break;
        case -15:   prefix = "f";   break;
        case -12:   prefix = "p";   break;
        case -9:    prefix = "n";   break;
        case -6:    prefix = "\\mu ";   break; //debugging micro? make sure to have a space after as in "\\mu " not "\\mu"
        case -3:    prefix = "m";   break;
        case 0:     prefix = " ";   break;
        case 3:     prefix = "k";   break;
        case 6:     prefix = "M";   break;
        case 9:     prefix = "G";   break;
        case 12:    prefix = "T";   break;
        case 15:    prefix = "P";   break;
        case 18:    prefix = "E";   break;
        case 21:    prefix = "Z";   break;
        case 24:    prefix = "Y";   break;
        default: prefix = "?"; break;
    }
    if(units == "m"){ //don't go above km for distances
        if(t_exp >= 3){
            t_exp = 3;
            prefix = "k";
            precision = exp;
        }
    }
    if(t_exp == 0 && forceoutput == false){
        return "";
    }
    if(dopplerfreq == true){
        precision = exp + 2;
    }
    var output = "";
    if(outputnumber == true){
        if(prependequals){ //outputnumber and output units allow splitting the answer to throw in the cosine in between for AC signals
            output = "=";
        }
        output += sign;
        output += argument.toPrecision(precision);
    }
    if(outputunits == true){
        output += prefix+units;
    }
    return output;
}

function writeComplexRectEng(real,imag,units){
    var sign = "+";
    var realabs = Math.abs(real);
    var imagabs = Math.abs(imag);
    if (imag < 0)
        sign = "-";
    if (realabs < IOTA){
        if(imagabs < IOTA){
            return "0"+units;
        }
        else{
            if (imag > 0) sign = "";
            return sign+"j"+writeEng(imagabs,units,false,true);
        }
    }
    if(imagabs < IOTA){
        return writeEng(real,units,false,true);
    }
    return "["+writeEng(real,"",false,true)+sign+"j"+writeEng(imagabs,"",false,true)+"]"+units;
}

function writePolarBasic(cmag,ctheta){
    return cmag.toFixed(3)+"\\angle{"+writeTripleLatex(ctheta)+"}^{\\circ}";
}

function writePolarEng(cmag,ctheta,units,decimal=false,db=false){
    var firstpart,secondpart;
    if(decimal==true){
        firstpart = writeTripleLatex(cmag,"");
        secondpart = units;
    }
    else{
        firstpart = writeEng(cmag,units,false,true,false,true,false);
        secondpart = writeEng(cmag,units,false,true,false,false,true);
    }
    return firstpart+"\\angle{"+ctheta.toFixed(2)+"}^{\\circ}"+secondpart;
}

function writeTimeBasedEng(mag,freq,phase,units){
    var phasesign;
    var phaseabs = Math.abs(phase);
    if(phase>=0) phasesign = "+";
    else phasesign = "-";
    return writeEng(mag,units,false,true,false,true,false)+"cos(360^{\\circ}"+writeEng(freq,"",false,true,false,true,true)+"t"+
        phasesign+phaseabs.toFixed(2)+"^{\\circ})"+writeEng(mag,units,false,true,false,false,true);
}

//******************************************* TABS AND HTML ***************************************************************/

function InitPage () {
    document.getElementById("defaultOpen").click();
}

const tabbackgroundcolor = '#33F';
const darktabbackgroundcolor = '#030';

function NextSection(){
    //figure out which one is next, then call OpenBigTab
    var tablinks, i;
    tablinks = document.getElementsByClassName("tablink");
    for(i = 0; i< tablinks.length-1; i++){
        if(tablinks[i].style.backgroundColor.length > 0){
            tablinks[i+1].onclick();
            window.scrollTo(0, 0);
            break;
        }
    }
}

function openBigTab(whichtoshow,whatelement){
    var i, tabcontent, tablinks, currentid;
    tabcontent = document.getElementsByClassName("tabcontent");
    for(i = 0; i < tabcontent.length; i++){
        currentid = tabcontent[i].id;
        if(currentid == whichtoshow){
            tabcontent[i].style.display = "block";;
            if(i == tabcontent.length-1){
                document.getElementById("nextsectionbutton").disabled = true;
            }
            else document.getElementById("nextsectionbutton").disabled = false;
        }
        else{
            tabcontent[i].style.display = "none";
        }
    }
    tablinks = document.getElementsByClassName("tablink");
    for(i = 0; i < tablinks.length; i++){
        tablinks[i].style.backgroundColor = "";
        if(whatelement == tablinks[i]) ChangedContent(i); 
    }
    whatelement.style.backgroundColor = tabbackgroundcolor;
}

function ChangedContent(whichtype){
    switch(whichtype){
        case 0  : ChangedDC();           break;
        case 1  : ChangedAC();              break;
        case 2  : ChangedTransmission();    break;
        case 3  : ChangedDistribution();    break;
        case 4  : ChangedEfficiency();      break;
        case 5  : ChangedComplex();         break;
        case 6  : ChangedIC();              break;
        case 7  : ChangedFilter();          break;
        case 8  : ChangedTransducer();      break;
        case 9  : ChangedDR();              break;
        case 10 : ChangedModulation();      break;
        case 11 : ChangedComm();            break;
        case 12 : ChangedCommPicture();     break;
        case 13 : ChangedRadar();           break;
        case 14 : ChangedDoppler();         break;
    }
}

function GrabNumber(argumenthtml,exponenthtml,includeexponent,minvalue,maxvalue){
    EnforceNumericalHTML(argumenthtml,minvalue,maxvalue);
    var answer = parseFloat(document.getElementById(argumenthtml).value);
    if(includeexponent == true){
        answer *= Math.pow(10,parseFloat(document.getElementById(exponenthtml).value));
    }
    return answer;
}

function NewMathAtItem(mathexpression, htmlitem){
    var input = mathexpression;
    var output = document.getElementById(htmlitem);
    output.innerHTML = '';
    MathJax.texReset();
    var options = MathJax.getMetricsFor(output);
    //options.display = display.checked;
    MathJax.tex2chtmlPromise(input, options).then(function (node) {
      //
      //  The promise returns the typeset node, which we add to the output
      //  Then update the document to include the adjusted CSS for the
      //    content of the new equation.
      //
      output.appendChild(node);
      MathJax.startup.document.clear();
      MathJax.startup.document.updateDocument();
    }).catch(function (err) {
      //
      //  If there was an error, put the message into the output instead
      //
      output.appendChild(document.createElement('pre')).appendChild(document.createTextNode(err.message));
    }).then(function () {
      //
      //  Error or not, re-enable the display and render buttons
      //
      //button.disabled = display.disabled = false;
    });
}

//generic, enforce numerical entries
function EnforceNumericalHTML(entryitem, min, max){
    var current = document.getElementById(entryitem).value;
    if(isNaN(current)) current = 0;
    if(current < min) current = min;
    if(current > max) current = max;
    document.getElementById(entryitem).value = current;
}

//generic, ChangedInput (go through all)
function SetLengthHTML(length, arghtml, exphtml){
    if(length > 1000){
        document.getElementById(exphtml).value="3";
        document.getElementById(arghtml).value = length/1000.0;
    }
    else if(length > 1){
        document.getElementById(exphtml).value="0";
        document.getElementById(arghtml).value = length;
    }
    else{
        document.getElementById(exphtml).value="-3";
        document.getElementById(arghtml).value = length*1000.0;
    }
}

//******************************************* CHANGE FUNCTIONS ****************************************************/



function ChangedDC(){
    EnforceNumericalHTML("virvoltage",minnorm,maxnorm);
    var virv = document.getElementById("virvoltage").value * Math.pow(10,document.getElementById("selectvvir").value);
    EnforceNumericalHTML("virresistance",minnorm,maxnorm);
    var virr = document.getElementById("virresistance").value * Math.pow(10,document.getElementById("selectrvir").value);
    var viri = virv/virr;
    var virexpression = "I=\\frac{V}{R}=\\frac{"+writeTripleLatex(virv,"V")+"}{"+
                        writeTripleLatex(virr,"\\Omega")+"}="+writeTripleLatex(viri,"A")+writeEng(viri,"A",true,false,false);
    NewMathAtItem(virexpression,"virequation");

    EnforceNumericalHTML("pvivoltage",minnorm,maxnorm);
    var pviv = document.getElementById("pvivoltage").value * Math.pow(10,document.getElementById("selectvpvi").value);
    EnforceNumericalHTML("pvicurrent",minnorm,maxnorm);
    var pvii = document.getElementById("pvicurrent").value * Math.pow(10,document.getElementById("selectipvi").value);
    var pvip = pviv*pvii;
    var pviexpression = "P=V \\times I="+writeTripleLatex(pviv,"V")+"\\times"+
                        writeTripleLatex(pvii,"A")+"="+writeTripleLatex(pvip,"W")+writeEng(pvip,"W",true,false,false);
    NewMathAtItem(pviexpression,"pviequation");

    EnforceNumericalHTML("kvlra",minnorm,maxnorm);
    EnforceNumericalHTML("kvlrb",minnorm,maxnorm);
    EnforceNumericalHTML("kvlrc",minnorm,maxnorm);
    EnforceNumericalHTML("kvlv",minnorm,maxnorm);
    var kvlra = document.getElementById("kvlra").value * Math.pow(10,document.getElementById("selectkvlra").value);
    var kvlrb = document.getElementById("kvlrb").value * Math.pow(10,document.getElementById("selectkvlrb").value);
    var kvlrc = document.getElementById("kvlrc").value * Math.pow(10,document.getElementById("selectkvlrc").value);
    var kvlv = document.getElementById("kvlv").value * Math.pow(10,document.getElementById("selectkvlv").value);
    var kvlrbc = 1.0/(1.0/kvlrb + 1.0/kvlrc);
    var kvlrbcexp = "R_{BC}=\\frac{1}{\\frac{1}{R_B}+\\frac{1}{R_C}}=\\frac{1}{\\frac{1}{"
        +writeTripleLatex(kvlrb,"\\Omega")+"}+\\frac{1}{"
        +writeTripleLatex(kvlrc,"\\Omega")+"}}="
        +writeTripleLatex(kvlrbc,"\\Omega")+writeEng(kvlrbc,"\\Omega",true,false,false);
    NewMathAtItem(kvlrbcexp,"resistanceparallel");
    var kvlrabc = kvlra + kvlrbc;
    var kvlrabcexp = "R_{ABC}=R_A+R_{BC}="
        +writeTripleLatex(kvlra,"\\Omega")+"+"+writeTripleLatex(kvlrbc,"\\Omega")+"="
        +writeTripleLatex(kvlrabc,"\\Omega")+writeEng(kvlrabc,"\\Omega",true,false,false);
    NewMathAtItem(kvlrabcexp,"resistanceseries");
    var kvli = kvlv / kvlrabc;
    var kvliexp = "I_S=\\frac{V_S}{R_{EQ}}=\\frac{"+writeTripleLatex(kvlv,"V")+"}{"+writeTripleLatex(kvlrabc,"\\Omega")+"}="
        +writeTripleLatex(kvli,"A")+writeEng(kvli,"A",true,false,false);
    NewMathAtItem(kvliexp,"kvlohms");
    var kvlib = kvli*kvlrc/(kvlrb+kvlrc);
    var kvlibexp = "I_B=\\frac{R_C}{R_B+R_C}\\times I_S=\\frac{"
        +writeTripleLatex(kvlrc,"\\Omega")+"}{"+writeTripleLatex(kvlrb,"\\Omega")+"+"+writeTripleLatex(kvlrc,"\\Omega")+"}\\times"
        +writeTripleLatex(kvli,"A")+"="+writeTripleLatex(kvlib,"A")+writeEng(kvlib,"A",true,false,false);
    NewMathAtItem(kvlibexp,"currentdividerb");
    var kvlic = kvli*kvlrb/(kvlrb+kvlrc);
    var kvlicexp = "I_C=\\frac{R_B}{R_B+R_C}\\times I_S=\\frac{"
        +writeTripleLatex(kvlrb,"\\Omega")+"}{"+writeTripleLatex(kvlrb,"\\Omega")+"+"+writeTripleLatex(kvlrc,"\\Omega")+"}\\times"
        +writeTripleLatex(kvli,"A")+"="+writeTripleLatex(kvlic,"A")+writeEng(kvlic,"A",true,false,false);
    NewMathAtItem(kvlicexp,"currentdividerc");
    var kvlvc = kvlic*kvlrc;
    var kvlvb = kvlib*kvlrb;
    var kvliverifyb = "V_B=I_B\\times R_B="+writeTripleLatex(kvlib,"A")+"\\times"+writeTripleLatex(kvlrb,"\\Omega")+"="+writeEng(kvlvb,"V",false,true,false);
    var kvliverifyc = "V_C=I_C\\times R_C="+writeTripleLatex(kvlic,"A")+"\\times"+writeTripleLatex(kvlrc,"\\Omega")+"="+writeEng(kvlvc,"V",false,true,false);
    NewMathAtItem(kvliverifyb,"currentdividerverifyb");
    NewMathAtItem(kvliverifyc,"currentdividerverifyc");
    var kvlvbc = kvlv*kvlrbc/kvlrabc;
    var kvlvdexp = "V_{BC}=\\frac{R_{BC}}{R_{EQ}}\\times V_{S}=\\frac{"+writeTripleLatex(kvlrbc,"\\Omega")+"}{"+writeTripleLatex(kvlrabc,"\\Omega")+"}\\times"
        +writeTripleLatex(kvlv,"V")+"="+writeTripleLatex(kvlvbc,"V")+writeEng(kvlvbc,"V",true,false,false);
    NewMathAtItem(kvlvdexp,"voltagedivider");
    var kvlva = kvlv - kvlvb;
    var kvlkvlexp = "V_A=V_S-V_B="+writeTripleLatex(kvlv,"V")+"-"+writeTripleLatex(kvlvb,"V")+"="
        +writeTripleLatex(kvlva,"V")+writeEng(kvlva,"V",true,false,false);
    NewMathAtItem(kvlkvlexp,"kvlkvl");
    var kvlisum = kvlib + kvlic;
    var kclexp = "I_B+I_C="+writeTripleLatex(kvlib,"A")+"+"+writeTripleLatex(kvlic,"A")+"="+writeTripleLatex(kvlisum,"A")+writeEng(kvlisum,"A",true,false,false);
    NewMathAtItem(kclexp,"kclkcl");
}

function GetResponse(R,L,C,w,topo){
    var helper, denom;
    var mag = 1;
    var phi = 0;
    switch(topo){
        case "SRLC":
            helper = 1.0-w*w*C*L;
            denom = helper*helper+w*w*R*R*C*C;
            mag = 1.0/Math.sqrt(denom);
            phi = -180/Math.PI*Math.atan2(w*R*C,helper);
        break;
        case "SRC":
            mag = 1.0/Math.sqrt(1+w*w*R*R*C*C);
            phi = -180/Math.PI*Math.atan2(w*R*C,1);
        break;
        case "SCR":
            mag = 1.0/Math.sqrt(1+1/(w*w*R*R*C*C));
            phi = -180/Math.PI*Math.atan2(-1/(w*R*C),1);
        break;
        case "SRL":
            mag = 1.0/Math.sqrt(1+R*R/(w*w*L*L));
            phi = -180/Math.PI*Math.atan2(-R/(w*L),1);
        break;
        case "SLR":
            mag = 1.0/Math.sqrt(1+w*w*L*L/(R*R));
            phi = -180/Math.PI*Math.atan2(w*L/R,1);
        break ;
        case "SLC":
            mag = 1-(w*w*L*C);
            phi = -180/Math.PI*Math.atan2(0,mag);
            mag = Math.abs(mag);
        break;
        case "SCL":
            mag = 1-1.0/(w*w*L*C);
            phi = -180/Math.PI*Math.atan2(0,mag);
            mag = Math.abs(mag);
        break;
    }
    return [mag,phi];
}

function ChangedFilter(){
    var f0 = GrabNumber("FilterFreq0","FilterFreq0P",true,minnorm,maxnorm);
    var R = GrabNumber("FilterR","FilterRP",true,minnorm,maxnorm);
    var L = GrabNumber("FilterL","FilterLP",true,minnorm,maxnorm);
    var C = GrabNumber("FilterC","FilterCP",true,minnorm,maxnorm);
    var f1 = GrabNumber("FilterFreq1","FilterFreq1P",true,minnorm,maxnorm);
    var f2 = GrabNumber("FilterFreq2","FilterFreq2P",true,minnorm,maxnorm);
    var topo = document.getElementById("Filtertopology").value;
    var ymin=Math.pow(10,document.getElementById("BodeMinP").value);
    var ymax=Math.pow(10,document.getElementById("BodeMaxP").value);
    var Greal, Gimag,denom,helper,omega;
    var GPolar = new Array(2);
    var gainexp, gainexpline2;
    omega = 2*Math.PI*f0;
    GPolar = GetResponse(R,L,C,omega,topo);
    switch(topo){
        case "SRLC":
            gainexp = "Gain=\\frac{Z_C}{Z_R+Z_L+Z_C}=\\frac{1}{(1-\\omega^2CL)+j\\omega RC}"+
            "=\\frac{(1-\\omega^2CL)-j\\omega RC}{(1-\\omega^2CL)^2+\\omega^2R^2C^2}=";
            gainexpline2 = "\\lvert Gain \\rvert=\\frac{1}{\\sqrt{(1-\\omega^2CL)^2+\\omega^2R^2C^2}}";
        break;
        case "SRC":
            gainexp = "Gain=\\frac{Z_C}{Z_C+Z_R}=\\frac{1}{1+\\frac{Z_R}{Z_C}}=\\frac{1}{1+j\\omega RC}=";
            gainexpline2 = "\\lvert Gain \\rvert=\\frac{1}{\\sqrt{1+(\\omega RC)^2}}=\\frac{1}{\\sqrt{2}}\\rightarrow \\omega_{co}=\\frac{1}{RC}\\rightarrow"+
            " f_{co}=\\frac{1}{2\\pi RC}="+writeEng(1/(2*Math.PI*R*C),"Hz",false,true);
        break;
        case "SCR":
            gainexp = "Gain=\\frac{Z_R}{Z_R+Z_C}=\\frac{1}{1+\\frac{Z_C}{Z_R}}=\\frac{1}{1-j\\frac{1}{\\omega RC}}=";
            gainexpline2 = "\\lvert Gain \\rvert=\\frac{1}{\\sqrt{1+\\frac{1}{(\\omega RC)^2}}}=\\frac{1}{\\sqrt{2}}\\rightarrow \\omega_{co}=\\frac{1}{RC}\\rightarrow"+
            " f_{co}=\\frac{1}{2\\pi RC}="+writeEng(1/(2*Math.PI*R*C),"Hz",false,true);
        break;
        case "SRL":
            gainexp = "Gain=\\frac{Z_L}{Z_L+Z_R}=\\frac{1}{1+\\frac{Z_R}{Z_L}}=\\frac{1}{1-j\\frac{R}{\\omega L}}=";
            gainexpline2 = "\\lvert Gain \\rvert=\\frac{1}{\\sqrt{1+(\\frac{R}{\\omega L})^2}}=\\frac{1}{\\sqrt{2}}\\rightarrow \\omega_{co}=\\frac{R}{L}\\rightarrow"+
            " f_{co}=\\frac{R}{2\\pi L}="+writeEng(R/(2*Math.PI*L),"Hz",false,true);
        break;
        case "SLR":
            gainexp = "Gain=\\frac{Z_R}{Z_R+Z_L}=\\frac{1}{1+\\frac{Z_L}{Z_R}}=\\frac{1}{1+j\\frac{\\omega L}{R}}=";
            gainexpline2 = "\\lvert Gain \\rvert=\\frac{1}{\\sqrt{1+(\\frac{\\omega L}{R})^2}}=\\frac{1}{\\sqrt{2}}\\rightarrow \\omega_{co}=\\frac{R}{L}\\rightarrow"+
            " f_{co}=\\frac{R}{2\\pi L}="+writeEng(R/(2*Math.PI*L),"Hz",false,true);
        break;
        case "SLC":
            gainexp = "Gain=\\frac{Z_C}{Z_C+Z_L}=\\frac{1}{1+\\frac{Z_L}{Z_C}}=\\frac{1}{1+j^2\\omega^2 LC}=";
            gainexpline2 = "\\lvert Gain \\rvert=\\frac{1}{\\sqrt{1+(\\omega^2LC)^2}}";
        break;
        case "SCL":
            gainexp = "Gain=\\frac{Z_L}{Z_L+Z_C}=\\frac{1}{1+\\frac{Z_C}{Z_L}}=\\frac{1}{1+j^2\\frac{1}{\\omega^2 LC}}=";
            gainexpline2 = "\\lvert Gain \\rvert=\\frac{1}{\\sqrt{1+\\frac{1}{(\\omega^2LC)^2}}}";
        break;
    }
    if(GPolar[0] >= 0.01){
        gainexp+=writePolarBasic(GPolar[0],GPolar[1]);
    }else gainexp+=writePolarEng(GPolar[0],GPolar[1],"",true,false);
    NewMathAtItem(gainexp,"FilterGain");
    NewMathAtItem(gainexpline2,"FilterGainFinish");
    var canvas = document.getElementById("canvasBODE");
    if (canvas == null || !canvas.getContext){console.log("bad canvas"); return;} 
    var ctx = canvas.getContext("2d");
    initPlot(f1,ymin,f2,ymax,canvas.width,canvas.height,(f2-f1)/40,(ymax-ymin)/20,true, 100,100,25,25);
    showGrid(ctx,true,false,true);
    FillFrequencyResponse(R,L,C,topo);
    PlotFrequencyResponse(ctx,R,L,C,topo);
    var timewindow = GrabNumber("timewindow","timewindowp",true,1,999);
    var voltagewindow = GrabNumber("vwindow","vwindowp",true,1,999);
    var autotime = document.getElementById("checktimewindow").checked;
    var autovoltage = document.getElementById("checkvoltagewindow").checked;
    var SignalVs = document.getElementsByClassName("filtervoltage");
    var SignalVPs = document.getElementsByClassName("filtervoltagep");
    var SignalFs = document.getElementsByClassName("filterfreq");
    var SignalFPs = document.getElementsByClassName("filterfreqp");
    var SignalPhis = document.getElementsByClassName("filterphi");

    var outvs = document.getElementsByClassName("outv");
    var outvps = document.getElementsByClassName("outvp");
    var outfs = document.getElementsByClassName("outf");
    var outfps = document.getElementsByClassName("outfp");
    var outphis = document.getElementsByClassName("outphi");

    var sig = new Array(SignalVs.length+1);
    var out = new Array(SignalVs.length+1);

    var height, geussheight, inputh, outputh;
    var width, guesswidth, lowestf, f;
    inputh = 0;
    outputh = 0;
    lowestf = -1;
    for(var i = 0; i < SignalVs.length; i++){
        sig[i] = new Array(3); //mag, freq,phase
        sig[i][0] = parseFloat(SignalVs[i].value)*Math.pow(10,parseFloat(SignalVPs[i].value));
        inputh += sig[i][0];
        sig[i][1] = parseFloat(SignalFs[i].value)*Math.pow(10,parseFloat(SignalFPs[i].value));
        sig[i][2] = Math.PI/180*parseFloat(SignalPhis[i].value);

        f = sig[i][1];
        if(lowestf < 0 ||(f < lowestf && f > 0)) lowestf = f;
        omega = Math.PI*2*f;
        GPolar = GetResponse(R,L,C,omega,topo);
        out[i] = new Array(3); //mag, freq,phase
        out[i][0] = sig[i][0]*GPolar[0];
        outputh += out[i][0];
        out[i][1] = sig[i][1];
        out[i][2] = sig[i][2]+Math.PI/180*GPolar[1];

        outvs[i].value=out[i][0];
        outvps[i].value="0";
        outfs[i].value=parseFloat(SignalFs[i].value);
        outfps[i].value=parseFloat(SignalFPs[i].value);
        outphis[i].value=out[i][2];

    }
    sig[SignalVs.length]=new Array(3); //mag, freq,phase
    sig[SignalVs.length][0]=GrabNumber("filterbias","filterbiasp",true,0,999);
    sig[SignalVs.length][1]=0;
    sig[SignalVs.length][2]=0;
    inputh += sig[SignalVs.length][0];

    GPolar = GetResponse(R,L,C,0,topo);
    out[SignalVs.length]=new Array(3); //mag, freq,phase
    out[SignalVs.length][0]=sig[SignalVs.length][0]*GPolar[0]
    out[SignalVs.length][1]=0;
    out[SignalVs.length][2]=0;
    outputh += out[SignalVs.length][0];

    document.getElementById("outputbias").value=out[SignalVs.length][0];
    document.getElementById("outputbiasp").value="0";

    if(autotime){
        width = 5/lowestf;
        PushEngNotation(width,"timewindow","timewindowp");
    }
    else{
        width = timewindow;
    }
    if(autovoltage){
        if(inputh > outputh)
            geussheight = inputh;
        else
            geussheight = outputh;
        height = geussheight;
    }
    else{
        height = voltagewindow;
        PushEngNotation(height,"vwindow","vwindowp");
    }
        
    canvas = document.getElementById("canvasFilterTime");
    if (canvas == null || !canvas.getContext){console.log("bad canvas"); return;} 
    ctx = canvas.getContext("2d");
    initPlot(0,-height,width,height,canvas.width,canvas.height,width/50,height/10,false,100,100,25,25);
    GridSetAxisUnits("s","V");
    showGrid(ctx,true,false,true);
    var size = FillCosineSum(sig);
    PlotEvaldFunction(ctx,size,sumofsigt,sumofsig,"blue");

    var size = FillCosineSum(out);
    PlotEvaldFunction(ctx,size,sumofsigt,sumofsig,"red");
}

var modleft = 0;
var modright = 2;
function SetModSpectrum(choice){
    var checks = document.getElementsByClassName("modview");
    var ch = 0;
    for(var c = 0; c < checks.length; c++){
        checks[c].checked = false;    
    }
    switch(choice){
        case 'wayleft': modleft = 0; modright = 0; ch = 0; break;
        case 'left': modleft = 0; modright = 1; ch=1; break;
        case 'center':modleft= 1; modright = 1; ch=2; break;
        case 'right':modleft = 2; modright = 2; ch=3; break;
        case 'full' :modleft = 0; modright = 2; ch=4; break;
        default: break;        
    }
    checks[ch].checked = true;
    UpdateModulationView();
}

function drawSpectralPoint(ctx,index,freqs,mags,xoffset,yoffset,alignright){
    drawLabeledPoint(ctx,freqs[index],mags[index],"("+writeEng(freqs[index],"Hz",false,true)+", "+writeEng(mags[index],"V",false,true)+")",xoffset,yoffset,alignright);
}

function Filter(freqs, mags, fco, type="lpf"){ //assume no phase change for those that pass.
    var newmags = new Float32Array(freqs.length);
    for(var i = 0; i < freqs.length; i++){
        newmags[i] = mags[i];
        switch(type){
            case "lpf": if(freqs[i] > fco) newmags[i] = 0; break;
            case "hpf": if(freqs[i] < fco) newmags[i] = 0; break;
            default: break;
        }
    }
    return newmags;
}

function Mix(freqs, mags, phases, fx, Ax, phasex){
    var inputlength = freqs.length;
    var lastinput = inputlength-1;
    var outputlength = inputlength*2;
    var haszero = false;
    var hasfx = false;
    var offsetzero = 0;
    var thezero = -1; //would like data to be org'd from lowest f to highest f.
    for(var i = 0; i< inputlength; i++){
        //check for f = 0 or f = fx
        if(freqs[i]==0){
            haszero = true;
            thezero = i;
            offsetzero = 1;
        }
        if(freqs[i]==fx) hasfx = true;
    }
    if(haszero){
        outputlength -= 1;
        if(thezero > 0){ 
            //put the zero at the last slot
            var tempf, tempm, tempp;
            tempf = freqs[thezero];
            tempm = mags[thezero];
            tempp = phases[thezero];
            freqs[thezero] = freqs[lastinput];
            mags[thezero] = mags[lastinput];
            phases[thezero] = phases[lastinput];
            freqs[lastinput] = tempf;
            mags[lastinput] = tempm;
            phases[lastinput] = tempp;
        }
        thezero = lastinput;
    }
    var newfreqs = new Float32Array(outputlength);
    var newphases = new Float32Array(outputlength);
    var newmags   = new Float32Array(outputlength);
    for(var i = 0; i < inputlength; i++){
        if(i == thezero){
            newfreqs[lastinput] = fx;
            newmags[lastinput] = Ax*mags[lastinput];
            newphases[lastinput] = phasex;
        }
        else{
            newfreqs[i]=fx-freqs[i];
            newfreqs[i+inputlength]=fx+freqs[i];
            newphases[i]=phasex-phases[i];
            newphases[i+inputlength]=phasex+phases[i];
            newmags[i]=0.5*mags[i]*Ax;
            newmags[i+inputlength]=0.5*mags[i]*Ax;
        }
    }
    return {newfreqs,newmags,newphases};
}

function IFT(freqs, mags, phases, t0, dt, numsamples){
    var resulty = new Float32Array(numsamples);
    var resultt = new Float32Array(numsamples);
    var gosimple = false; //force simple regardless of phases passed
    if(phases == 0) gosimple = true;
    var sum;
    var i, t, s;
    var numsigs = freqs.length;
    for(i = 0; i < numsamples; i++){
        t = i*dt+t0;
        resultt[i] = t;
        sum = 0;
        for(s = 0; s < numsigs; s++){
            if(gosimple)
                sum += mags[s]*Math.cos(2*Math.PI*freqs[s]*t);
            else
                sum += mags[s]*Math.cos(2*Math.PI*freqs[s]*t+phases[s]);
        }
        resulty[i] = sum;
    }
    return {resultt, resulty};
}

function isEven(number){
    var mod = number%2;
    if(mod > 0) return true;
    return false;
}

function DFT(ydata, samplerate){
    //returns the DFT of the data provided, provided that it was properly spaced in time. magnitude only.
    //will also folder over the upper half, where position 0 is N, 1 to N-1, etc.
    var N = ydata.length;
    var result = new Float32Array(N);
    var phases = new Float32Array(N);
    for(var k = 0; k < N; k++){
        var rsum = 0;
        var isum = 0;
        for(var n = 0; n < N; n++){
            rsum += ydata[n]*Math.cos(-n*k/N*Math.PI*2);
            isum += ydata[n]*Math.sin(-n*k/N*Math.PI*2);
        }
        rsum = rsum/N;
        isum = isum/N;
        result[k] = Math.sqrt(rsum*rsum+isum*isum);
        phases[k] = Math.atan2(isum, rsum);

    }
    var lastindex;
    if(isEven(N))   lastindex = N/2-1;
    else            lastindex = Math.round(N/2);
    for(var n = 1; n < N/2; n++){
        if(N-n > n)
            result[n] += result[N-n]; 
    }
    var newmags = result.subarray(0,lastindex);
    var newfreqs = new Float32Array(newmags.length);
    var newphases = phases.subarray(0,lastindex);
    for(var i = 0; i < newfreqs.length; i++){
        newfreqs[i] = i*samplerate/N;
    }
    return {newmags, newfreqs, newphases};
}

var mod_width;
var mod_message_timet, mod_message_timey;
var mod_message_spectrumf, mod_message_spectruma, mod_message_spectrump;
var mod_am_timet, mod_am_timey;
var mod_am_spectrumf, mod_am_spectruma, mod_am_spectrump;
var mod_rectified_timet, mod_rectified_timey;
var mod_rectified_spectrumf, mod_rectified_spectruma, mod_rectified_spectrump;
var mod_demod_env_timet, mod_demod_env_timey;
var mod_demod_env_lpf_timet, mod_demod_env_lpf_timey;
var mod_demod_env_hpf_timet, mod_demod_env_hpf_timey;
var mod_demod_env_lpf_spectrumf, mod_demod_env_lpf_spectruma, mod_demod_env_lpf_spectrump;
var mod_demod_env_hpf_spectrumf, mod_demod_env_hpf_spectruma, mod_demod_env_hpf_spectrump;
var mod_demod_sync_timet, mod_demod_sync_timey;
var mod_demod_sync_spectrumf, mod_demod_sync_spectruma, mod_demod_sync_spectrump;
var mod_demod_sync_time_filteredt, mod_demod_sync_time_filteredy;
var mod_time_max, mod_spectrum_max;
var mod_fx, mod_fc, mod_fm;

function maxvalueofarray(argument){
    var result = 0;
    for(var i = 0; i < argument.length; i++){
        if(argument[i]>result) result = argument[i];
    }
    return result;
}

function maxvaluetime(){
    var next, result;
    result = maxvalueofarray(mod_message_timey);
    next   = maxvalueofarray(mod_am_timey);
    if(next > result) result = next;
    next   = maxvalueofarray(mod_demod_sync_timey);
    if(next > result) result = next;
    return result;
}
function maxvaluespectrum(){
    var next, result;
    result = maxvalueofarray(mod_message_spectruma);
    next   = maxvalueofarray(mod_am_spectruma);
    if(next > result) result = next;
    next   = maxvalueofarray(mod_demod_sync_spectruma);
    if(next > result) result = next;
    return result;
}

function ChangedModulation(){

    var fc = GrabNumber("carrierf","carrierfp",true,1,999);
    var Ac = GrabNumber("carrierv","carriervp",true,1,999);
    var B  = GrabNumber("messageb","messagebp",true,0,999);
    var fx = GrabNumber("demodf","demodfp",true,1,999);
    var timewindow = GrabNumber("modtimewindow","modtimewindowp",true,1,999);
    var numsamples = GrabNumber("modsamplesize","",false,100,10000);
    var freqs = document.getElementsByClassName("msgfreqs");
    var freqPs= document.getElementsByClassName("msgfreqPs");
    var amps = document.getElementsByClassName("msgamps");
    var ampPs = document.getElementsByClassName("msgampPs");
    var phis = document.getElementsByClassName("msgphis");
    var nummsgcos = freqs.length;
    var nummsgs = freqs.length;
    var numdemods = nummsgs*4;
    var lowestfreq = parseFloat(freqs[0].value)*Math.pow(10,parseFloat(freqPs[0].value));
    var highestfreq = parseFloat(freqs[nummsgs-1].value)*Math.pow(10,parseFloat(freqPs[nummsgs-1].value));
    var alphaisvalid = true;
    var height = B;
    var tallest = B;
    if(nummsgs > 1)
        alphaisvalid = false;
    
    //assign message freq's and the bias into the last position of the message
    mod_message_spectrumf = new Float32Array(nummsgcos+1);
    mod_message_spectruma = new Float32Array(nummsgcos+1);
    mod_message_spectrump = new Float32Array(nummsgcos+1);
    for(var m = 0; m < nummsgcos; m++){
        var thismag = parseFloat(amps[m].value)*Math.pow(10,parseFloat(ampPs[m].value));
        var thisfreq = parseFloat(freqs[m].value)*Math.pow(10,parseFloat(freqPs[m].value));
        mod_message_spectrumf[m] = thisfreq;
        mod_message_spectruma[m] = thismag;
        mod_message_spectrump[m] = parseFloat(phis[m].value)*Math.PI/180.0;
        height += thismag;
        if(thismag > tallest) tallest = thismag;
        if(thisfreq > highestfreq) highestfreq = thisfreq;
        if(thisfreq < lowestfreq ) lowestfreq  = thisfreq;
    }

    mod_fx = fx;
    mod_fc = fc;
    mod_fm = highestfreq;

    mod_message_spectrumf[nummsgcos] = 0;
    mod_message_spectruma[nummsgcos] = B;
    mod_message_spectrump[nummsgcos] = 0;

    var t0 = 0;
    mod_width = timewindow;
    var dt = mod_width/numsamples;
    var samplerate = 1/dt;

    //IFT the input
    var iftresult = IFT(mod_message_spectrumf, mod_message_spectruma, mod_message_spectrump, t0, dt, numsamples);
    mod_message_timet = iftresult.resultt;
    mod_message_timey = iftresult.resulty;

    //create the mix with the carrier:
    var mixresult = Mix(mod_message_spectrumf, mod_message_spectruma, mod_message_spectrump, fc, Ac, 0);
    mod_am_spectrumf = mixresult.newfreqs;
    mod_am_spectruma = mixresult.newmags;
    mod_am_spectrump = mixresult.newphases;
    //console.log(mod_am_spectrumf,mod_am_spectruma,mod_am_spectrump);

    //IFT the am (mix)
    var amift = IFT(mod_am_spectrumf, mod_am_spectruma, mod_am_spectrump, t0, dt, numsamples);
    mod_am_timet = amift.resultt;
    mod_am_timey = amift.resulty;
    //console.log(mod_am_timet,mod_am_timey);

    //Branch 1: rectify the am time signal
    mod_rectified_timet = new Float32Array(mod_am_timet.length);
    mod_rectified_timey = new Float32Array(mod_am_timey.length);
    for(var i = 0; i < mod_am_timey.length; i++){
        mod_rectified_timet[i] = mod_am_timet[i];
        if(mod_am_timey[i] < 0) mod_rectified_timey[i] = 0;
        else mod_rectified_timey[i] = mod_am_timey[i];
    }
    //DFT the rectified signal
    var dft_of_rectified = DFT(mod_rectified_timey,samplerate);
    mod_rectified_spectruma = dft_of_rectified.newmags;
    mod_rectified_spectrumf = dft_of_rectified.newfreqs;
    mod_rectified_spectrump = dft_of_rectified.newphases;
    console.log("dft of rect:",mod_rectified_spectrumf, mod_rectified_spectruma, mod_rectified_spectrump);

    //Filter the rectified signal for LPF > fm-max (highest)
    //var lpf_fco = highestfreq*1.01;
    var lpf_fco = 20000;
    mod_demod_env_lpf_spectruma = Filter(mod_rectified_spectrumf,mod_rectified_spectruma, lpf_fco, "lpf");
    mod_demod_env_lpf_spectrumf = mod_rectified_spectrumf;
    mod_demod_env_lpf_spectrump = mod_rectified_spectrump;

    //IFT the LPF output for time display
    var lpfoutput = IFT(mod_demod_env_lpf_spectrumf,mod_demod_env_lpf_spectruma, mod_demod_env_lpf_spectrump, t0, dt, numsamples);
    mod_demod_env_lpf_timet = lpfoutput.resultt;
    mod_demod_env_lpf_timey = lpfoutput.resulty;

    //Filter the rectified signal for HPF > fm-max (highest)
    //var hpf_fco = lowestfreq*0.99;
    var hpf_fco = 10;
    mod_demod_env_hpf_spectruma = Filter(mod_demod_env_lpf_spectrumf,mod_demod_env_lpf_spectruma, hpf_fco, "hpf");
    mod_demod_env_hpf_spectrumf = mod_rectified_spectrumf;
    mod_demod_env_hpf_spectrump = mod_rectified_spectrump;

    //IFT the HPF output for time display
    var hpfoutput = IFT(mod_demod_env_hpf_spectrumf,mod_demod_env_hpf_spectruma, mod_demod_env_hpf_spectrump, t0, dt, numsamples);
    mod_demod_env_hpf_timet = hpfoutput.resultt;
    mod_demod_env_hpf_timey = hpfoutput.resulty;

    //Branch 2: create the de-mix with the synchronizer
    var syncresult = Mix(mod_am_spectrumf, mod_am_spectruma, mod_am_spectrump, fx, 1, 0);
    mod_demod_sync_spectruma = syncresult.newmags;
    mod_demod_sync_spectrumf = syncresult.newfreqs;
    mod_demod_sync_spectrump = syncresult.newphases;

    //IFT the de-mix
    var syncift = IFT(mod_demod_sync_spectrumf, mod_demod_sync_spectruma, mod_demod_sync_spectrump, t0, dt, numsamples);
    mod_demod_sync_timet = syncift.resultt;
    mod_demod_sync_timey = syncift.resulty;

    mod_time_max = maxvaluetime();
    mod_spectrum_max = maxvaluespectrum();

    if(alphaisvalid){
        var Am = mod_message_spectruma[0];
        var alpha = Am/B;
        var qalpha = "\\alpha = \\frac{A_m}{B} = \\frac{"+writeEng(Am,"V",false,true)+"}{"+writeEng(B,"V",false,true)+"}="+alpha.toFixed(4);;
        var eta;
        var qeta = "\\eta = \\frac{\\alpha^2}{\\alpha^2+2}"+"=\\frac{{"+alpha.toFixed(4)+"}^2}{{"+alpha.toFixed(4)+"}^2+2}";
        if(B > 0){
            eta = alpha*alpha/(alpha*alpha+2);
            qeta += "="+eta.toFixed(4);
        }
        else{
            eta = 1.0;
            qeta += "=1.0";
        }
        NewMathAtItem(qalpha,"qalpha");
        NewMathAtItem(qeta,"qeta");
    }
    else{
        NewMathAtItem("\\alpha = \\frac{A_m}{B} \\text{ expression is invalid with more than one message component}","qalpha");
        NewMathAtItem("\\eta = \\frac{\\alpha^2}{\\alpha^2+2} \\text{ expression is invalid with more than one message component}","qeta");
    }

    UpdateModulationView()
}

function UpdateModulationView(){
    var canvas, ctx, height;
    height = mod_time_max;

    canvas = document.getElementById("canvasMODtime");
    if (canvas == null || !canvas.getContext){console.log("bad canvas"); return;} 
    ctx = canvas.getContext("2d");

    initPlot(0,-height,mod_width,height,canvas.width,canvas.height,mod_width/50,height/10,false,100,100,25,25);
    GridSetAxisUnits("s","V");
    showGrid(ctx,true,false,true);
    ctx.textAlign = "left";
    ctx.font = "15px Helvetica";
    ctx.fillText("Plot of Amplitude Modulated Signal, V_am(t)",100,20);

    if(document.getElementById("modtimemsg").checked)
        PlotEvaldFunction(ctx,mod_message_timet.length,mod_message_timet,mod_message_timey,"green");
    if(document.getElementById("modtimeam").checked)
        PlotEvaldFunction(ctx,mod_am_timet.length,mod_am_timet,mod_am_timey,"blue");
    if(document.getElementById("modtimerectified").checked)
        PlotEvaldFunction(ctx,mod_rectified_timet.length,mod_rectified_timet,mod_rectified_timey,"red");
    if(document.getElementById("modtimesmooth").checked)
        PlotEvaldFunction(ctx,mod_demod_env_lpf_timet.length,mod_demod_env_lpf_timet, mod_demod_env_lpf_timey, "purple");
    if(document.getElementById("modtimedebiased").checked)
        PlotEvaldFunction(ctx,mod_demod_env_hpf_timet.length,mod_demod_env_hpf_timet, mod_demod_env_hpf_timey, "magenta");

    canvas = document.getElementById("canvasMODspect");
    if (canvas == null || !canvas.getContext){console.log("bad canvas"); return;} 
    ctx = canvas.getContext("2d");

    var stopfreq = modright*mod_fc+5*mod_fm;
    var startfreq = modleft*mod_fc-5*mod_fm;
    var freqspan = stopfreq-startfreq;
    var dfreq = freqspan/50; //round to a nearest power of 10?
    var dfreqpower = Math.log10(dfreq);
    var dfreqpowerrounded = Math.round(dfreqpower-0.5);
    var dfreqbase  = Math.round(dfreq/Math.pow(10,dfreqpowerrounded));
    var roundedfreqstep = dfreqbase*Math.pow(10,dfreqpowerrounded);
    var stopmag;
    var autovoltage = document.getElementById("modspecvoltageauto").checked;
    var uservoltage = GrabNumber("modspecvoltagewindow","modspecvoltagewindowp",true,1,999);
    if(autovoltage){
        stopmag = mod_spectrum_max;
        PushEngNotation(stopmag,"modspecvoltagewindow","modspecvoltagewindowp");
    }
    else stopmag = uservoltage;

    initPlot(startfreq,0,stopfreq,stopmag,canvas.width,canvas.height,roundedfreqstep,stopmag/10,false,100,100,25,25);
    GridSetAxisUnits("Hz","V");
    showGrid(ctx,true,false,true);
    ctx.textAlign = "left";
    ctx.font = "15px Helvetica";
    ctx.fillText("Spectrum of Amplitude Modulated Signal, |V_am(f)|,V",100,20);

    if(document.getElementById("modshowmsg").checked){
        PlotEvaldFunction(ctx,mod_message_spectrumf.length,mod_message_spectrumf,mod_message_spectruma,"green",false,false,true,true);
        //drawSpectralPoint(ctx,0,mod_message_spectrumf,mod_message_spectruma,0,-15,true);
    }
    if(document.getElementById("modshowam").checked){
        PlotEvaldFunction(ctx,mod_am_spectrumf.length,mod_am_spectrumf,mod_am_spectruma,"blue",false,false,true,true);
        //drawSpectralPoint(ctx,nummsgs-1,freqs,mags,0,-15,true);
        //drawSpectralPoint(ctx,nummsgs*2-1,freqs,mags,0,-15,true);
        //drawSpectralPoint(ctx,nummsgs*2,freqs,mags,0,-15,true);
    }
    if(document.getElementById("modshowdemod").checked){
        //drawSpectralPoint(ctx,whichdemodpoint,dfreqs,dmags,0,-15,true);
        PlotEvaldFunction(ctx,mod_demod_sync_spectrumf.length,mod_demod_sync_spectrumf,mod_demod_sync_spectruma,"red",false,false,true,true);
    }

    if(document.getElementById("modshowdemodenv").checked){
        PlotEvaldFunction(ctx,mod_rectified_spectrumf.length,mod_rectified_spectrumf,mod_rectified_spectruma,"magenta",false,false,true,true);
        //drawSpectralPoint(ctx,whichdemodpoint,dfreqs,dmags,0,-15,true);
        //PlotEvaldFunction(ctx,nummsgs*4+2,dfreqs,dmags,"red",false,false,true,true);
    }
}

function PushEngNotation(number, inputnumber, selectpower){
    var absvalue = Math.abs(number);
    var msign = +1;
    if(number < 0){
        msign = -1;
    }
    var exp = 0;
    if(number != 0)
        exp = Math.log(absvalue) / Math.log(10);
    var triplets = Math.round(exp/3.0-0.5);
    var t_exp = 3*triplets;
    var argument = absvalue / Math.pow(10,t_exp);
    document.getElementById(inputnumber).value = msign*argument;
    document.getElementById(selectpower).value = t_exp;
}

function FillCosineSum(signals, sigbias=0, xdcrK=1, xdcrB=0){
    var tpi = Math.PI*2;
    var count = 0;
    for(var t = plotxstart; t < plotxend; t+= plotxpixelstep){
        var sum = 0;    
        for(var f = 0; f < signals.length; f++){
            sum += signals[f][0]*Math.cos(tpi*signals[f][1]*t+signals[f][2]);
        }
        sumofsig[count]=(sum+sigbias)*xdcrK+xdcrB;
        sumofsigt[count]=t;
        count++;
    }
    return count;
}

var bigdata;
function  FillCosineSumForDFT(signals, samplerate, samplesize){
    bigdata = new Array(samplesize);
    var tpi = Math.PI*2;
    var time;
    for(var t = 0; t < samplesize; t++){
        var sum = 0;    
        time = t/samplerate;
        for(var f = 0; f < signals.length; f++){
            sum += signals[f][0]*Math.cos(tpi*signals[f][1]*time+signals[f][2]);
        }
        bigdata[t]=sum;
    }
}

function ChangedIC(){
    var ICfreq = GrabNumber("ICfreq","ICfreqexp",true,minnorm,maxnorm);
    var ICres  = GrabNumber("ICresistance","ICresistanceP",true,minnorm,maxnorm);
    var ICind  = GrabNumber("inductorvalue","inductorvalueexp",true,minnorm,maxnorm);
    var ICcap  = GrabNumber("capacitancevalue","capacitancevalueexp",true,minnorm,maxnorm);
    var ICLimp = Math.PI*2*ICfreq*ICind;
    var ICCimp = 1/(Math.PI*2*ICfreq*ICcap);
    var ICresexp = "Z_R=R="+writeEng(ICres,"\\Omega",false,true);
    NewMathAtItem(ICresexp,"ICrexp");
    var ICLexppart2 = "";
    if(ICLimp>=1000) ICLexppart2 = "=j"+writeEng(ICLimp,"\\Omega");
    var ICLexp = "Z_L=j\\omega L=j2\\pi f L=j2\\pi"+writeTripleLatex(ICfreq,"Hz")+"\\times"+writeTripleLatex(ICind,"H")+"="+
        "j"+writeTripleLatex(ICLimp,"\\Omega")+ICLexppart2;
    NewMathAtItem(ICLexp,"inductorimpedance");
    var ICCpart2 = "";
    if(ICCimp>=1000) ICCpart2 = "=-j"+writeEng(ICCimp,"\\Omega");
    var ICCexp = "Z_C=\\frac{1}{j\\omega C}=\\frac{-j}{2\\pi fC}=\\frac{-j}{2\\pi"+writeTripleLatex(ICfreq,"Hz")+"\\times"+writeTripleLatex(ICcap,"F")+"}="+
        "-j"+writeTripleLatex(ICCimp,"\\Omega")+ICCpart2;
    NewMathAtItem(ICCexp,"capacitorimpedance");
    var cktchoice = document.getElementById("topology").value;
    var Zeqexp = "Z_{EQ}=";
    var Zeqreal = 0;
    var Zeqimag = 0;
    var Zeqimagabs = 0;
    var ZeqPolar = new Array(2);
    var Zeqimagsign = "+";
    var Zeqw = 2*Math.PI*ICfreq;
    var Zeqw2 = Zeqw*Zeqw;
    var ICres2 = ICres*ICres;
    var ICres2rec = 1.0/ICres2;
    switch (cktchoice){
        case "SRLC": 
            Zeqreal = ICres;
            Zeqimag = ICLimp - ICCimp;
            Zeqexp += "Z_R+Z_L+Z_C="+writeEng(ICres,"\\Omega",false,true)+"+j"+writeEng(ICLimp,"\\Omega",false,true)+"-j"+
                writeEng(ICCimp,"\\Omega",false,true);
        break;
        case "SRC":
            Zeqreal = ICres;
            Zeqimag = -1*ICCimp;
            Zeqexp += "Z_R+Z_C="+writeEng(ICres,"\\Omega",false,true)+"-j"+writeEng(ICCimp,"\\Omega",false,true);
        break;
        case "SRL":
            Zeqreal = ICres;
            Zeqimag = ICLimp;
            Zeqexp += "Z_R+Z_L="+writeEng(ICres,"\\Omega",false,true)+"+j"+writeEng(ICLimp,"\\Omega",false,true);
        break;
        case "SLC": 
            Zeqreal = 0;
            Zeqimag = ICLimp - ICCimp;
            Zeqimagabs = Math.abs(Zeqimag);
            if(Zeqimag < 0) Zeqimagsign = "-";
            ZeqPolar = GetPolar(Zeqreal,Zeqimag);
            Zeqexp += "Z_L+Z_C=j"+writeEng(ICLimp,"\\Omega",false,true)+"-j"+writeEng(ICCimp,"\\Omega",false,true);
        break;
        case "PRLC": 
            var wRLmRwC = Zeqw*ICres*ICind-ICres/(Zeqw*ICcap);
            var wRLmRwCsquared = wRLmRwC*wRLmRwC;
            var denom  = ICind*ICind+ICcap*ICcap*wRLmRwCsquared;
            Zeqreal = ICres*ICind*ICind/denom;
            Zeqimag = -1*ICres*ICcap*ICind*wRLmRwC/denom;
            Zeqexp += "[\\frac{1}{Z_R}+\\frac{1}{Z_L}+\\frac{1}{Z_C}]^{-1}=[\\frac{1}{R}+\\frac{1}{j\\omega L}+j\\omega C]^{-1}=[\\frac{1}{"
                +writeEng(ICres,"\\Omega",false,true)+"}+\\frac{1}{j"+writeEng(ICLimp,"\\Omega",false,true)+"}+j("
                +writeEng(ICCimp,"\\Omega",false,true)+")]^{-1}";
        break;
        case "PRC":
            var denom = ICres2rec+Zeqw2*ICcap*ICcap;
            Zeqreal = (1.0/ICres)/denom;
            Zeqimag = -Zeqw*ICcap/denom;
            Zeqimagabs = Math.abs(Zeqimag);
            if(Zeqimag < 0) Zeqimagsign = "-";
            ZeqPolar = GetPolar(Zeqreal,Zeqimag);
            Zeqexp += "[\\frac{1}{Z_R}+\\frac{1}{Z_C}]^{-1}=[\\frac{1}{"+writeEng(ICres,"\\Omega",false,true)+"}-\\frac{1}{j"
                +writeEng(ICCimp,"\\Omega",false,true)+"}]^{-1}";
        break;
        case "PRL":
            var denom = ICres2+Zeqw2*ICind*ICind;
            Zeqreal = Zeqw2*ICres*ICind*ICind/denom;
            Zeqimag = Zeqw*ICres2*ICind/denom;
            Zeqimagabs = Math.abs(Zeqimag);
            if(Zeqimag < 0) Zeqimagsign = "-";
            ZeqPolar = GetPolar(Zeqreal,Zeqimag);
            Zeqexp += "[\\frac{1}{Z_R}+\\frac{1}{Z_L}]^{-1}=[\\frac{1}{"+writeEng(ICres,"\\Omega",false,true)+"}+\\frac{1}{j"
                +writeEng(ICLimp,"\\Omega",false,true)+"}]^{-1}";
        break;
        case "PLC":
            Zeqreal = 0;
            Zeqimag = -1.0/(Zeqw*ICcap-1.0/(Zeqw*ICind));
            Zeqimagabs = Math.abs(Zeqimag);
            if(Zeqimag < 0) Zeqimagsign = "-";
            ZeqPolar = GetPolar(Zeqreal,Zeqimag);
            Zeqexp += "[\\frac{1}{Z_C}+\\frac{1}{Z_L}]^{-1}=[\\frac{-1}{j"+writeEng(ICCimp,"\\Omega",false,true)+"}+\\frac{1}{j"
                +writeEng(ICLimp,"\\Omega",false,true)+"}]^{-1}";
        break;
    }
    ZeqPolar = GetPolar(Zeqreal,Zeqimag);
    Zeqexp += "="+writeComplexRectEng(Zeqreal,Zeqimag,"\\Omega")+"="+writePolarEng(ZeqPolar[0],ZeqPolar[1],"\\Omega");  
    NewMathAtItem(Zeqexp,"ICzeq");

    var ICvoltageeqn = "v_s(t)=10cos(360^{\\circ}"+writeEng(ICfreq,"",false,true,false)+"t+0^{\\circ})V"
        +"\\rightarrow V_S=10\\angle 0^{\\circ}V";
    NewMathAtItem(ICvoltageeqn,"ICvoltageeqn");
    var currentmag = 10.0/ZeqPolar[0];
    var currentphi = -ZeqPolar[1];
    var ICcurrenteqn = "I_S=\\frac{V_S}{Z_{EQ}}=\\frac{10\\angle 0^{\\circ}V}{"+writePolarEng(ZeqPolar[0],ZeqPolar[1],"\\Omega")+"}="
        +writeEng(currentmag,"A",false,true,false,true,false)+"\\angle"+currentphi.toFixed(2)+"^{\\circ}"+writeEng(currentmag,"A",false,true,false,false,true)
        +"\\rightarrow i_s(t)="+writeTimeBasedEng(currentmag,ICfreq,currentphi,"A");
    NewMathAtItem(ICcurrenteqn,"ICcurrenteqn");
    //make the chart
    var canvas = document.getElementById("canvasICplot");
    if (canvas == null || !canvas.getContext){
        console.log("bad canvas");
        return;
    } 
    var ctx = canvas.getContext("2d");
    var ICperiod = 1/ICfreq;
    var timestep = 0.5/50.0; //1 ms
    var vmax = 12;
    var vmin = -vmax;
    var currenttimepk = -currentphi/(360*ICfreq);
    var autoscaleIC = document.getElementById("autoscaleIC").checked;
    var vertmultiplier;
    var timeexp;
    if(autoscaleIC){
        timeexp = Math.log10(ICperiod);
        timeexp = Math.round(timeexp-0.2)-1;
        var exp = Math.log10(currentmag);
        exp = Math.round(exp-0.5);
        vertmultiplier = Math.pow(10,-exp);
        document.getElementById("currentzoom").value=exp;
        document.getElementById("timezoom").value=timeexp;
    }
    else{
        vertmultiplier = Math.pow(10,-document.getElementById("currentzoom").value);
        timeexp = document.getElementById("timezoom").value;
    }
    timestep = Math.pow(10,timeexp);
    initPlot(timestep*(-40),vmin,timestep*40,vmax,canvas.width,canvas.height,timestep,1);
    showGrid(ctx,true,true,true);
    drawComplexCosine(ctx,10,0,ICfreq,"blue");
    drawComplexCosine(ctx,currentmag*vertmultiplier,currentphi,ICfreq,"red");
    drawLegend(ctx,2,["Voltage","Current"],["blue","red"]);
    drawLabeledPoint(ctx,0,10,"0s,10V",5,0);
    drawLabeledPoint(ctx,currenttimepk,currentmag*vertmultiplier,writeEng(currenttimepk,"s",false,true)+","+writeEng(currentmag,"A",false,true),-100,-20);
}


var animationangle=0;
var animationInterval = null; 

function ChangedComplex(){
    var cmag   = GrabNumber("complexmag",0,false,0,10);
    var ctheta = GrabNumber("complextheta",0,false,-360,360);
    var cthetar = ctheta * Math.PI / 180.0;
    var creal = cmag*Math.cos(cthetar);
    var cimag = cmag*Math.sin(cthetar);
    var canvas = document.getElementById("canvasmagphase");
    if (canvas == null || !canvas.getContext){
        console.log("bad canvas");
        return;
    } 
    var ctx = canvas.getContext("2d");
    initPlot(-10,-10,10,10,canvas.width,canvas.height,1,1);
    showGrid(ctx,true,true,true);
    drawVector(ctx,creal,cimag);
    var complexsign = "+";
    if(cimag < 0)   complexsign = "-";
    var phasetorectexp = "Ae^{j\\theta}="+writeTripleLatex(cmag)+" e^{j "+ctheta.toFixed(2)+"^{\\circ}}"+"="+
        writeTripleLatex(cmag)+"cos("+ctheta.toFixed(2)+"^{\\circ})+j"+writeTripleLatex(cmag)+"sin("+ctheta.toFixed(2)+"^{\\circ})="+writeRectangular(creal,cimag);
    NewMathAtItem(phasetorectexp,"phasetorect");
    var phasorexp = "Ae^{j\\theta}="+writeTripleLatex(cmag)+" e^{j "+ctheta.toFixed(2)+"^{\\circ}}"+"="+writePolarBasic(cmag,ctheta);
    NewMathAtItem(phasorexp,"phasorform");
    var recttomagexp = "A=\\sqrt{Real^2+Imag^2}=\\sqrt{{"+writeTripleLatex(creal)+"}^2+{"+writeTripleLatex(cimag)+"}^2}="+writeTripleLatex(cmag);
    NewMathAtItem(recttomagexp,"recttomagnitude");
    var atanarg = cimag/creal;
    var atanphi = Math.atan(atanarg)*180/Math.PI;
    var recttophaseexp = "\\phi=tan^{-1}(\\frac{"+writeTripleLatex(cimag)+"}{"+writeTripleLatex(creal)+"})=tan^{-1}("+writeTripleLatex(atanarg)+")={"
        +atanphi.toFixed(2)+"}^{\\circ}\\text{ when }Real\\geq 0";
    NewMathAtItem(recttophaseexp,"recttophase");
    if(creal < 0){
        var fixcomplexexp = "Real<0\\rightarrow\\phi={"+atanphi.toFixed(2)+"}^{\\circ}+180^{\\circ}={"+(atanphi+180).toFixed(2)+"}^{\\circ}";
        NewMathAtItem(fixcomplexexp,"complexfixphase");
    }
    else{
        NewMathAtItem("Real\\geq 0 \\rightarrow \\text{ No Change, }\\phi={"+atanphi.toFixed(2)+"}^{\\circ}","complexfixphase");
    }
    
    var vm1 = GrabNumber("complexvm1",0,false,0,10);
    var vm2 = GrabNumber("complexvm2",0,false,0,10);
    var phi1= GrabNumber("complext1",0,false,-360,360);
    var phi2= GrabNumber("complext2",0,false,-360,360);
    var phi1rad = phi1 * Math.PI/180;
    var phi2rad = phi2 * Math.PI/180;
    var add1real = checkIota(vm1*Math.cos(phi1rad));
    var add2real = checkIota(vm2*Math.cos(phi2rad));
    var add1imag = checkIota(vm1*Math.sin(phi1rad));
    var add2imag = checkIota(vm2*Math.sin(phi2rad));
    var sumreal =  add1real + add2real;
    var sumimag =  add1imag + add2imag;
    var summag = Math.sqrt(sumreal*sumreal+sumimag*sumimag);
    var sumphi = Math.atan2(sumimag,sumreal);
    var sumphideg = sumphi*180/Math.PI;
    var complexadd1exp = "v_{s1}(t)="+writeTimeBasedEng(vm1,100,phi1,"V")+"\\rightarrow V_{S1}="+writePolarEng(vm1,phi1,"V");
    NewMathAtItem(complexadd1exp,"complexaddend1");
    var complexadd2exp = "v_{s2}(t)="+writeTimeBasedEng(vm2,100,phi2,"V")+"\\rightarrow V_{S2}="+writePolarEng(vm2,phi2,"V");
    NewMathAtItem(complexadd2exp,"complexaddend2");
    var complexadditionexp = writePolarEng(vm1,phi1,"V")+"+"+writePolarEng(vm2,phi2,"V")+"=["+writeRectangular(add1real,add1imag)+"]+["
        +writeRectangular(add2real,add2imag)+"]V=["+writeRectangular(sumreal,sumimag)+"]V";
    NewMathAtItem(complexadditionexp,"complexaddition");

    var complexresultexp = writeComplexRectEng(sumreal,sumimag,"V")+"="+writePolarEng(summag,sumphideg,"V")+"\\rightarrow v_{sum}(t)="+
        writeTimeBasedEng(summag,100,sumphideg,"V");
    NewMathAtItem(complexresultexp,"complexresult");
    
    canvas = document.getElementById("canvasaddvoltage");
    if (canvas == null || !canvas.getContext){
        console.log("bad canvas");
        return;
    } 
    ctx = canvas.getContext("2d");
    initPlot(-2.5/100,-10,2.5/100,10,canvas.width,canvas.height,0.0625/100,1);
    showGrid(ctx,true,true,true);
    drawComplexCosine(ctx,vm1,phi1,100,"blue");
    drawComplexCosine(ctx,vm2,phi2,100,"red");
    drawComplexCosine(ctx,summag,sumphideg,100,"purple");
    animatecomplexOnce();
}

function animatecomplexOnce(){
    var vm1 = GrabNumber("complexvm1",0,false,0,10);
    var vm2 = GrabNumber("complexvm2",0,false,0,10);
    var phi1rad= Math.PI/180*(animationangle+GrabNumber("complext1",0,false,-360,360));
    var phi2rad= Math.PI/180*(animationangle+GrabNumber("complext2",0,false,-360,360));
    var canvas = document.getElementById("canvasaddvectors");
    var r1 = vm1*Math.cos(phi1rad);
    var i1 = vm1*Math.sin(phi1rad);
    var r2 = vm2*Math.cos(phi2rad);
    var i2 = vm2*Math.sin(phi2rad);
    var rs = r1+r2;
    var is = i1+i2;
    if (canvas == null || !canvas.getContext){
        console.log("bad canvas");
        return;
    } 
    var ctx = canvas.getContext("2d");
    initPlot(-10,-10,10,10,canvas.width,canvas.height,1,1);
    showGrid(ctx,true,true,true);
    drawVector(ctx,r1,i1,0,0,"blue");
    drawVector(ctx,r2,i2,0,0,"red");
    drawVector(ctx,r1,i1,r2,i2,"gray");
    drawVector(ctx,r2,i2,r1,i1,"gray");
    drawVector(ctx,rs,is,0,0,"purple");
    animationangle += 1;
    if(animationangle >= 360) animationangle = 0;
}
function stopanimatecomplex(reset){
    if (reset){
        animationangle = 0;
        animatecomplexOnce();
    }
    clearInterval(animationInterval);
}
function animatecomplex(){
    //start a timer and a counter, no skip
    clearInterval(animationInterval);
    animationInterval = setInterval(animatecomplexOnce, 10);
}

function ChangedTransducer(){
    document.getElementById("numsamples").textContent = maxsamples;
    var sensora = GrabNumber("sensora","sensorap",true,-999,999);
    var sensorb = GrabNumber("sensorb","sensorbp",true,-999,999);
    var adca = GrabNumber("adca","adcap",true,-999,999);
    var adcb = GrabNumber("adcb","adcbp",true,-999,999);
    var testv = GrabNumber("testvoltage","testvoltagep",true,-999,999);
    var bitsize = GrabNumber("bitsize","",false,1,128);
    bitsize = Math.round(bitsize);
    document.getElementById("bitsize").value = bitsize;
    var deltay = adca-adcb;
    var deltax = sensora-sensorb;
    var Kval = deltay/deltax;
    var Bval = adca-Kval*sensora;
    var inverseK = 1/Kval;
    var inverseB = sensora-inverseK*adca;
    var Kexpanswer = writeTripleLatex(Kval,"");
    if(Kval < 1) Kexpanswer = Kval.toFixed(4);
    var Keqn = "K=\\frac{V_{Out,Max}-V_{Out,Min}}{V_{In,Max}-V_{In,Min}}=\\frac{V_{ADC,A}-V_{ADC,B}}{V_{Sensor,A}-V_{Sensor,B}}=\\frac{"
    +writeEng(adca,"V",false,true)+"-("+writeEng(adcb,"V",false,true)+")}{"+writeEng(sensora,"V",false,true)+"-("+writeEng(sensorb,"V",false,true)+")}="+
    Kexpanswer;
    NewMathAtItem(Keqn,"Keqn");
    var Beqn = "B=V_{ADC,A}-K\\times V_{Sensor,A}="+writeEng(adca,"V",false,true)+"-"+writeTripleLatex(Kval,"")+"\\times"+writeEng(sensora,"V",false,true)+"="+writeEng(Bval,"V",false,true);
    NewMathAtItem(Beqn,"Beqn");
    var vout = testv*Kval+Bval;
    var vouteqn = "V_{Out}=V_{In}\\times K+B="+writeEng(testv,"V",false,true)+"\\times "+writeTripleLatex(Kval,"")+"+("+writeEng(Bval,"V",false,true)+")="+writeEng(vout,"V",false,true);
    NewMathAtItem(vouteqn,"Vout");
    var res;
    var lower = adca;
    var upper = adcb;
    if(adca>adcb){
        lower = adcb;
        upper = adca;
    }
    var msg = "";
    var clipping = false;
    if(vout > upper){
        msg = "\\text{Voltage to ADC clipped to maximum}";
        clipping = true;
    }
    if(vout < lower){
        msg = "\\text{Voltage to ADC clipped to minimum}";
        clipping = true;
    }
    NewMathAtItem(msg,"clippingmessage");

    res = Math.abs(adcb-adca)/Math.pow(2,bitsize);
    var deltaveqn = "\\text{Resolution: }\\Delta V=\\frac{V_{Max}-V_{Min}}{2^b}=\\frac{"+writeEng(upper,"V",false,true)+"-("+writeEng(lower,"V",false,true)+")}{2^{"+bitsize.toFixed(0)+"}}="+writeEng(res,"V/level",false,true);
    NewMathAtItem(deltaveqn,"deltaV");
    var evald = (vout-lower)/res;
    var evaleqn = "\\text{Evaluated Level: }EL=\\frac{V_{In}-V_{Min}}{\\Delta V}=\\frac{"+writeEng(vout,"V",false,true)+"-("+writeEng(lower,"V",false,true)+")}{"+writeEng(res,"V/level",false,true)+"}="
        +evald.toFixed(3)+" levels\\rightarrow QL=Floor(EL)="+(evald-0.5).toFixed(0);
    NewMathAtItem(evaleqn,"evallevel");
    var QE = res*(evald - parseFloat((evald-0.5).toFixed(0)));
    var QEeqn = "\\text{Quantization Error: }QE = \\Delta V\\times(EL - QL) ="+writeEng(QE,"V",false,true);
    NewMathAtItem(QEeqn,"quantizationerror");

    var htmladcsigvs = document.getElementsByClassName("adcsignalv");
    var htmladcsigvps = document.getElementsByClassName("adcsignalvp");
    var htmladcsigfreqs = document.getElementsByClassName("adcsignalf");
    var htmladcsigfreqps = document.getElementsByClassName("adcsignalfp");
    var htmladcsigphis = document.getElementsByClassName("adcsignalphi");
    var adcsamplerate = parseFloat(document.getElementById("adcsamplerate").value)*Math.pow(10,parseFloat(document.getElementById("adcsamplefp").value));
    var adcsampleperiod = 1/adcsamplerate;
    var numcomps = htmladcsigvs.length;
    var sigs = new Array(numcomps);
    var sigB = parseFloat(document.getElementById("adcsignalvb").value)*Math.pow(10,parseFloat(document.getElementById('adcsignalvbp').value));
    for(var s = 0; s < numcomps; s++){
        sigs[s] = new Array(3);
        sigs[s][0] = parseFloat(htmladcsigvs[s].value)*Math.pow(10,parseFloat(htmladcsigvps[s].value));
        sigs[s][1] = parseFloat(htmladcsigfreqs[s].value)*Math.pow(10,parseFloat(htmladcsigfreqps[s].value));
        sigs[s][2] = Math.PI/180*parseFloat(htmladcsigphis[s].value);
    }
    var width = 1; 
    var canvas, ctx;
    
    //sensor Plot
    var sensormin = sensora;
    var sensormax = sensorb;
    if(sensora > sensorb){
        sensormin = sensorb;
        sensormax = sensora;
    }
    var sensorrange = sensormax-sensormin;
    canvas = document.getElementById("canvasXDCRtime");
    if (canvas == null || !canvas.getContext){console.log("bad canvas"); return;} 
    ctx = canvas.getContext("2d");
    initPlot(0,sensormin,width,sensormax,canvas.width,canvas.height,width/50,sensorrange/20,false,100,100,25,25);
    GridSetAxisUnits("s","V");
    showGrid(ctx,true,false,true);
    var size = FillCosineSum(sigs, sigB, 1, 0);
    PlotEvaldFunction(ctx,size,sumofsigt,sumofsig,"blue");
    ctx.textAlign = "left";
    ctx.font = "15px Helvetica";
    ctx.fillText("Sensor Output / XDCR Interface Input v(t)",100,20);

    //ADC Input and Output Plot
    var mid = (upper+lower)/2;
    var height = (upper - lower)*1.2;
    var graphlower = mid - height/2;
    var graphupper = mid + height/2;

    canvas = document.getElementById("canvasADCtime");
    if (canvas == null || !canvas.getContext){console.log("bad canvas"); return;} 
    ctx = canvas.getContext("2d");
    initPlot(0,graphlower,width,graphupper,canvas.width,canvas.height,width/50,height/20,false,100,100,25,25);
    GridSetAxisUnits("s","V");
    showGrid(ctx,true,false,true);
    var size = FillCosineSum(sigs, sigB, Kval, Bval);
    if(document.getElementById("ShowADCIn").checked)
        PlotEvaldFunction(ctx,size,sumofsigt,sumofsig,"blue");
    
    ctx.textAlign = "left";
    ctx.font = "15px Helvetica";
    ctx.fillText("XDCR Interface Output / ADC Input v(t) through DAC Output",100,20);
    var numsamples = Math.round(width * adcsamplerate);
    if(numsamples > maxsamples) numsamples = maxsamples;

    if(numsamples % 2 > 0)
        numsamples -= 1;

    var samplesety = new Array(numsamples);
    var samplesett = new Array(numsamples);
    
    //Sample data using the math sigs function again (and use the bias, K, and B to quantize for b value)
    var bitmax = Math.pow(2,bitsize)-1;
    for(var t = 0; t < numsamples; t++){
        var ctime = adcsampleperiod*t;
        samplesett[t] = ctime;
        samplesety[t] = sigB;
        for(var c = 0; c < numcomps; c++){
            samplesety[t] += sigs[c][0]*Math.cos(TWOPI*ctime*sigs[c][1]+sigs[c][2]);
        }
        //scale for the XDCR interface:
        samplesety[t] = samplesety[t]*Kval+Bval;
        //quantize step and clip
        var q = Math.round((samplesety[t]-lower)/res-0.5);
        if (q > bitmax) q = bitmax;
        if (q < 0) q = 0;
        samplesety[t] = lower+res*q;
    }

    //draw the dots
    if(document.getElementById("ShowDigitized").checked) PlotEvaldFunction(ctx,numsamples,samplesett,samplesety,"red",false,false,true);
    if(document.getElementById("ShowBlockStyle").checked) PlotEvaldFunction(ctx,numsamples,samplesett,samplesety,"red",false,true,false);
    
    //DFT The dots!
    var N = numsamples;
    var xkm = new Array(N);
    var xkp = new Array(N);
    var xkf = new Array(N);
    for(var f = 0; f < N; f++){
        var realsum = 0;
        var imagsum = 0;
        for(var n = 0; n < N; n++){
            realsum += samplesety[n]*Math.cos(-TWOPI*f*n/N);
            imagsum += samplesety[n]*Math.sin(-TWOPI*f*n/N);
        }
        realsum = realsum / N;
        imagsum = imagsum / N;
        xkm[f] = Math.sqrt(realsum*realsum+imagsum*imagsum);
        xkf[f] = adcsamplerate*f/N;
        xkp[f] = Math.atan2(imagsum,realsum); //in radians!
    }
    var dacopts = Math.round(N/2+0.5);
    var dacsigs = new Array(dacopts);

    //put the transform into the dacsigs, folded over for symmetry
    for(s = 0; s < dacopts; s++){
        dacsigs[s] = new Array(3);
        if(s > 0 && s < dacopts-1)
            xkm[s] += xkm[N-s];
        dacsigs[s][0] = xkm[s];
        dacsigs[s][1] = xkf[s];
        dacsigs[s][2] = xkp[s];
    }
    FillCosineSum(dacsigs, 0, 1, 0);
    if(document.getElementById("ShowDACOut").checked)
        PlotEvaldFunction(ctx,size,sumofsigt,sumofsig,"green");

    var LPF;
    if(document.getElementById("AutoLPF").checked){
        LPF = adcsamplerate/2;
        var LPFshow = LPF;
        var LPFpow = "0";
        if(LPF >= 1000){
            LPFshow = LPF/1000;
            LPFpow = "3";
        }
        document.getElementById("dacfco").value = LPFshow;
        document.getElementById("dacfcop").value = LPFpow;
    }
    else{
        var checkLPF;
        checkLPF = parseFloat(document.getElementById("dacfco").value)*Math.pow(10,parseFloat(document.getElementById("dacfcop").value));
        if(checkLPF < LPF) LPF = checkLPF;
    }
    if(LPF > adcsamplerate) LPF = adcsamplerate;
    var HPF = xkf[1];
    if(!document.getElementById("AutoHPF").checked){
        HPF = parseFloat(document.getElementById("dachfco").value)*Math.pow(10,parseFloat(document.getElementById("dachfcop").value));
    }
    var passedN = Math.round(LPF/adcsamplerate*N+0.5); //N is now even by above code
    var filteredDAC = new Array(passedN);
    var filteredms  = new Array(passedN);
    for(var s = 0; s < passedN; s++){
        filteredDAC[s] = new Array(3);
        filteredDAC[s][0] = dacsigs[s][0];
        filteredDAC[s][1] = dacsigs[s][1];
        filteredDAC[s][2] = dacsigs[s][2];
        filteredms[s] = dacsigs[s][0];
        if(filteredDAC[s][1]<HPF){
            filteredms[s] = 0;
            filteredDAC[s][0] = 0;
        }
    }
    for(var s = passedN; s < dacopts; s++){
        filteredms[s] = 0;
    }
    

    canvas = document.getElementById("canvasADCSpectrum");
    if (canvas == null || !canvas.getContext){console.log("bad canvas"); return;} 
    ctx = canvas.getContext("2d");
    var stopfreq = adcsamplerate/2;
    var stopmag = upper*0.7;
    initPlot(0,0,stopfreq,stopmag,canvas.width,canvas.height,stopfreq/50,stopmag/10,false,100,100,25,25);
    GridSetAxisUnits("Hz","V");
    showGrid(ctx,true,false,true);

    PlotEvaldFunction(ctx,dacopts,xkf,xkm,"green",false,false,true,true);
    PlotEvaldFunction(ctx,dacopts,xkf,filteredms,"purple",false,false,true,true);
    ctx.textAlign = "left";
    ctx.font = "15px Helvetica";
    ctx.fillText("Spectrum of Sampled Data and Filtered DAC Output",100,20);

    //DAC Plot
    canvas = document.getElementById("canvasDACtime");
    if (canvas == null || !canvas.getContext){console.log("bad canvas"); return;} 
    ctx = canvas.getContext("2d");
    initPlot(0,sensormin,width,sensormax,canvas.width,canvas.height,width/50,sensorrange/20,false,100,100,25,25);
    GridSetAxisUnits("s","V");
    showGrid(ctx,true,false,true);
    FillCosineSum(filteredDAC, 0, inverseK, 0);
    PlotEvaldFunction(ctx,size,sumofsigt,sumofsig,"purple");
    ctx.textAlign = "left";
    ctx.font = "15px Helvetica";
    ctx.fillText("Filtered DAC Output",100,20);
}

function writeMemory(number, power){
    var suffix="";
    switch(power){
        case 0: suffix = "B"; break;
        case 10: suffix="KB"; break;
        case 20: suffix="MB"; break;
        case 30: suffix="GB"; break;
        case 40: suffix="TB"; break;
        case 50: suffix="PB"; break;
        default: suffix="?B"; break;
    }
    return number.toFixed(2)+" "+suffix;
}

function getmultiplier(unit){
    switch(unit){
        case "s": multiplier = 1; break;
        case "min": multiplier=60; break;
        case "hr": multiplier=3600; break;
        case "day": multiplier=86400; break;
        case "year": multiplier=31536000; break;
        default: multiplier = 1; break;
    }
    return multiplier;
}
function GetNumberOfBits(number, power){
    return number*Math.pow(2,power)*8;
}

function ChangedDR(){
    var fs = GrabNumber("DRsamplerate","DRsampleratep",true,minnorm,maxnorm);
    var b = Math.round(document.getElementById("DRbitsize").value);
    var maxvalue = Math.pow(2,b)-1;
    document.getElementById("DRbitsize").value = b;
    var decimal = Math.round(document.getElementById("DRdecimal").value);
    if(decimal < 0) decimal = 0;
    if(decimal > maxvalue) decimal = maxvalue;
    document.getElementById("DRdecimal").value = decimal;
    var binarytext = decimal.toString(2);
    while(binarytext.length < b)
        binarytext = "0"+binarytext;
    var eqnbinary = "\\text{The decimal number }"+decimal.toFixed(0)+"\\text{ in } "+b.toFixed(0)+"\\text{-bit binary is }"+binarytext;
    NewMathAtItem(eqnbinary,"eqnDRbinary");
    var bitrate = fs*b;
    var bitrateexp = "\\text{bit rate = }f_s\\times b="+writeEng(fs,"Hz",false,true,false)+"\\times "+b.toFixed(0)+"="+writeEng(bitrate,"bps",false,true);
    NewMathAtItem(bitrateexp,"eqnbitrate");
    var usermemory = parseFloat(document.getElementById("DRmemory").value);
    var usermempower = parseFloat(document.getElementById("DRmemoryp").value);
    var resbits = GetNumberOfBits(usermemory,usermempower);
    var resseconds = resbits/bitrate;
    var eqnsolveforT = "T=\\frac{Memory}{DataRate}=\\frac{"+writeMemory(usermemory,usermempower)+"}{"+writeEng(bitrate,"bps",false,true)+"}="+
        "\\frac{"+usermemory.toFixed(2)+"\\times 2^{"+usermempower.toFixed(0)+"}B s}{"+writeTripleLatex(bitrate,"b",false)+"}\\times\\frac{8b}{1B}="+resseconds.toFixed(1)+"s";
    NewMathAtItem(eqnsolveforT,"DRsolveT");
    var resminutes, reshours;
    var eqnextratime = "";
    if(resseconds >= 60 && resseconds < 3600){
        resminutes = resseconds / 60;
        eqnextratime = resseconds.toFixed(1)+"s\\times\\frac{1 min}{60s}="+resminutes.toFixed(2)+"min";
    }
    else if(resseconds >= 3600){
        reshours = resseconds / 3600;
        eqnextratime = resseconds.toFixed(1)+"s\\times\\frac{1 hr}{3600s}="+reshours.toFixed(2)+"hr";
    }
    NewMathAtItem(eqnextratime,"DRsolveTsecond");
    var usermemory2 = parseFloat(document.getElementById("DRmemory2").value);
    var usermempower2 = parseFloat(document.getElementById("DRmemory2p").value); 
    var drtimebase = parseFloat(document.getElementById("DRtime").value);
    var drtimeunit = document.getElementById("DRtimeM").value;
    var timeconv = "";
    if(drtimeunit == "min"){
        timeconv = "\\times\\frac{1 min}{60 s}";
    }
    if(drtimeunit == "hr"){
        timeconv = "\\times\\frac{1 hr}{3600 s}";
    }
    var drtimemultiplier = getmultiplier(drtimeunit);
    var bitrate2 = GetNumberOfBits(usermemory2,usermempower2)/(drtimebase*drtimemultiplier);
    var eqnsolvebitrate2 = "bit rate=\\frac{Memory}{Time}=\\frac{"+writeMemory(usermemory2,usermempower2)+"}{"+drtimebase.toFixed(2)+drtimeunit+"}"+
    "=\\frac{"+usermemory2.toFixed(2)+"\\times 2^{"+usermempower2.toFixed(0)+"}B}{"+drtimebase.toFixed(2)+drtimeunit+"}\\times\\frac{8b}{1B}"+timeconv+
    "="+writeEng(bitrate2,"bps",false,true); 
    NewMathAtItem(eqnsolvebitrate2,"DRsolveBR");

    var bitrate3 = GrabNumber("DRrate3","DRrate3p",true,1,999);
    var time3 = parseFloat(document.getElementById("DRtime3").value);
    var timeunit3 = document.getElementById("DRtimeM3").value;
    var multiplier3 = getmultiplier(timeunit3);
    var timeconv3 = "";
    if(timeunit3 == "min") timeconv3 = "\\times\\frac{60s}{1min}";
    if(timeunit3 == "hr") timeconv3 = "\\times\\frac{3600s}{1hr}";
    var memorybits = bitrate3*time3*multiplier3;
    var memorybytes = memorybits/8;
    var KBs = memorybytes/1024;
    var MBs = KBs/1024;
    var GBs = MBs/1024;
    var TBs = GBs/1024;
    var memanswer = memorybytes;
    var mempower3 = 0;
    var memconv = "";
    if(TBs >= 1){      memconv = "\\times\\frac{1TB}{2^{40}B}";mempower3 = 40; memanswer=TBs }
    else if(GBs >= 1){ memconv = "\\times\\frac{1GB}{2^{30}B}";mempower3 = 30; memanswer=GBs }
    else if(MBs >= 1){ memconv = "\\times\\frac{1MB}{2^{20}B}";mempower3 = 20; memanswer=MBs }
    else if(KBs >= 1){ memconv = "\\times\\frac{1KB}{2^{10}B}";mempower3 = 10; memanswer=KBs }
    var DRprob3exp = "Memory=DataRate\\times Time="+writeEng(bitrate3,"bps")+"\\times"+time3.toFixed(2)+timeunit3+"=\\frac{"+
        writeTripleLatex(bitrate3,"b")+"}{s}\\times\\frac{1B}{8b}"+memconv+"\\times"+time3.toFixed(2)+timeunit3+timeconv3+"="+
        writeMemory(memanswer,mempower3);
    NewMathAtItem(DRprob3exp,"DRsolveMem");
}


function ToggleCanvas(which){
    if(document.getElementById(which).style.display == "none")
        document.getElementById(which).style.display = "block";
    else
        document.getElementById(which).style.display = "none";
}
function HideCanvasX(){
    ToggleCanvas("canvasXDCRtime");
}
function HideCanvasA(){
    ToggleCanvas("canvasADCtime");
}
function HideCanvasS(){
    ToggleCanvas("canvasADCSpectrum");
}
function HideCanvasD(){
    ToggleCanvas("canvasDACtime");
}

function PlaySoundOldV(vs, vps, fs, fps, phis){
    var htmladcsigvs = document.getElementsByClassName(vs);
    var htmladcsigvps = document.getElementsByClassName(vps);
    var htmladcsigfreqs = document.getElementsByClassName(fs);
    var htmladcsigfreqps = document.getElementsByClassName(fps);
    var htmladcsigphis = document.getElementsByClassName(phis);
    var audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
    for(var s = 0; s < htmladcsigvs.length; s++){
        var oscillator = audioCtx.createOscillator();
        var gainNode = audioCtx.createGain();
        var gain = htmladcsigvs[s].value*Math.pow(10,htmladcsigvps[s].value);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.value = gain;
        oscillator.frequency.value = htmladcsigfreqs[s].value*Math.pow(10,htmladcsigfreqps[s].value);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + ((1000 || 500) / 1000));
    }
}

const maxfreq = 10000; 

function PlaySound(vs, vps, fs, fps, phis){
    //the oscillator requires the Re/Im components of each signal, so convert to rectangular of each signal!
    //the bias is not audible and is not included
    var htmladcsigvs = document.getElementsByClassName(vs);
    var htmladcsigvps = document.getElementsByClassName(vps);
    var htmladcsigfreqs = document.getElementsByClassName(fs);
    var htmladcsigfreqps = document.getElementsByClassName(fps);
    var htmladcsigphis = document.getElementsByClassName(phis);
    
    var real = new Float32Array(maxfreq);
    var imag = new Float32Array(maxfreq);
    for(var f = 0; f < maxfreq; f++){
        real[f] = 0;
        imag[f] = 0;
    }

    var ac = new AudioContext();
    var osc = ac.createOscillator();

    var r, i, gain, phase , freq;
    for(var s = 0; s < htmladcsigvs.length; s++){
        gain = htmladcsigvs[s].value*Math.pow(10,htmladcsigvps[s].value);
        phase = htmladcsigphis[s].value*Math.PI/180;
        freq = Math.round(htmladcsigfreqs[s].value*Math.pow(10,htmladcsigfreqps[s].value));
        r = gain*Math.cos(phase);
        i = gain*Math.sin(phase);
        if(freq < maxfreq && freq > 49){
            real[freq] = r;
            imag[freq] = i;
        }
    }
    
    osc.frequency.value = 1;
    var wave = ac.createPeriodicWave(real,imag);
    osc.setPeriodicWave(wave);
    osc.connect(ac.destination);
    osc.start();
    osc.stop(2);
}

function PlayFilterInput(){
    PlaySound("filtervoltage","filtervoltagep","filterfreq","filterfreqp","filterphi");
}

function PlayFilterOutput(){
    PlaySound("outv","outvp","outf","outfp","outphi");
}

function PlayADCInputSound(){
    PlaySound("adcsignalv","adcsignalvp","adcsignalf","adcsignalfp","adcsignalphi");
}

function beep(duration, frequency, volume, type, callback) {
    var oscillator = audioCtx.createOscillator();
    var gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (volume){gainNode.gain.value = volume;}
    if (frequency){oscillator.frequency.value = frequency;}
    if (type){oscillator.type = type;}
    if (callback){oscillator.onended = callback;}

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + ((duration || 500) / 1000));
};

var currentoutput = 0;
function AddOutputComponent(){
    currentoutput++;
    var newid = currentoutput.toFixed(0);
    var signalhtmls = document.getElementsByClassName("outputadd");
    var element = signalhtmls[signalhtmls.length-1];
    var clone = element.cloneNode(true);
    clone.id = "outputpart"+newid;
    element.after(clone);
}

var currentfreq = 0;
function AddSignalFreq(){
    currentfreq++;
    var newid = currentfreq.toFixed(0);
    //var element = document.querySelector('#signal0');
    var signalhtmls = document.getElementsByClassName("addablesignal");
    var element = signalhtmls[signalhtmls.length-1];
    var clone = element.cloneNode(true);
    clone.id = "signalcomponent"+newid;
    element.after(clone);
}

var currentfilterfreq = 0;
function AddFilterComponent(){
    currentfilterfreq++;
    var newid = currentfilterfreq.toFixed(0);
    var signalhtmls = document.getElementsByClassName("addablepart");
    var element = signalhtmls[signalhtmls.length-1];
    var clone = element.cloneNode(true);
    clone.id = "filterpart"+newid;
    element.after(clone);
    AddOutputComponent();
}

var currentmsgcomp = 0;
function AddMessageComponent(){
    currentmsgcomp++;
    var newid = currentmsgcomp.toFixed(0);
    var signalhtmls = document.getElementsByClassName("messagecomponent");
    var element = signalhtmls[signalhtmls.length-1];
    var clone = element.cloneNode(true);
    clone.id = "messagepart"+newid;
    element.after(clone);
    ChangedModulation();
}

function RandomizeMessages(){
    var freqs = document.getElementsByClassName("msgfreqs");
    var freqPs= document.getElementsByClassName("msgfreqPs");
    var amps = document.getElementsByClassName("msgamps");
    var ampPs = document.getElementsByClassName("msgampPs");
    var phases = document.getElementsByClassName("msgphis");
    var Normalize = 1000/freqs.length;
    for(var q = 0; q < freqs.length; q++){
        freqs[q].value = Math.round(Math.random()/0.05)/10;
        freqPs[q].value = "3";
        amps[q].value = Math.random()*(Normalize);
        ampPs[q].value = "-3";
        phases[q].value = Math.random()*360;
    }
    //then sort the frequencies?
    var temp;
    for(var q = 0; q < freqs.length; q++){
        for(var r = 0; r <  freqs.length; r++){
            if(freqs[q].value < freqs[r].value){
                temp = freqs[q].value;
                freqs[q].value = freqs[r].value;
                freqs[r].value = temp;
            }
        }
    }
    ChangedModulation();
}

function CleanUpMessages(){
    var signalhtmls = document.getElementsByClassName("messagecomponent");
    while(signalhtmls.length > 1) signalhtmls[signalhtmls.length-1].remove();
    ChangedModulation();
}

function CleanUpComponents(){
    var signalhtmls = document.getElementsByClassName("addablepart");
    while(signalhtmls.length > 1) signalhtmls[signalhtmls.length-1].remove();
    signalhtmls = document.getElementsByClassName("outputadd");
    while(signalhtmls.length > 1) signalhtmls[signalhtmls.length-1].remove();
}

function AutoSquareWhat(vs, vps, fs, fps, phis)
{
    var htmladcsigvs = document.getElementsByClassName(vs);
    var htmladcsigvps = document.getElementsByClassName(vps);
    var htmladcsigfreqs = document.getElementsByClassName(fs);
    var htmladcsigfreqps = document.getElementsByClassName(fps);
    var htmladcsigphis = document.getElementsByClassName(phis);
    var q = htmladcsigvs.length;
    var v0 = htmladcsigvs[0].value;
    var vx;
    var vp= htmladcsigvps[0].value;
    var factor = 1;
    var f0 = htmladcsigfreqs[0].value;
    var fx;
    var fp = parseFloat(htmladcsigfreqps[0].value);
    htmladcsigphis[0].value = 0;
    //var p0 = htmladcsigphis[0].value;
    var phase = 0;
    for(var t = 1; t < q; t++){
        factor += 2;
        if(phase == 0) phase = 180;
        else phase = 0;
        //var phasemod = (factor*p0)%360;
        vx = v0 / factor;
        if(vx < 1.0){
            vx = vx*1000;
            vp = vp-3;
            v0 = v0*1000;
        }
        fx = f0*factor;
        if(fx >= 1000.0){
            fx = fx/1000;
            fp = fp+3;
            f0 = f0/1000;
        }
        htmladcsigvs[t].value=vx;
        htmladcsigvps[t].value=vp;
        htmladcsigfreqs[t].value=fx;
        htmladcsigfreqps[t].value=fp;
        htmladcsigphis[t].value=phase;
    }    
}
function AutoSquareFilter(){
    AutoSquareWhat("filtervoltage","filtervoltagep","filterfreq","filterfreqp","filterphi");
}

function AutoSquare(){
    AutoSquareWhat("adcsignalv","adcsignalvp","adcsignalf","adcsignalfp","adcsignalphi");
}

function AutoSquareModSignal(){
    AutoSquareWhat("msgamps","msgampPs","msgfreqs","msgfreqPs","msgphis");
    ChangedModulation();
}

function ChangedAC(){
    var acperiod = GrabNumber("ACperiod","selectACperiod",true,minnorm,maxnorm);
    var acfreq   = 1/acperiod;
    var acperiodexp = "f=\\frac{1}{T}=\\frac{1}{"+writeTripleLatex(acperiod,"s")+"}="+writeTripleLatex(acfreq,"Hz")+writeEng(acfreq,"Hz",true,false,false);
    NewMathAtItem(acperiodexp,"periodfrequency");
    var acvmax = GrabNumber("ACVmax","selectACVmax",true,-maxnorm,maxnorm);
    var acvmin = GrabNumber("ACVmin","selectACVmin",true,-maxnorm,maxnorm);
    var acphi =  GrabNumber("ACphi","none",false,-360,360);
    var rmsr = GrabNumber("rmsresistance","selectrmsr",true,minnorm,maxnorm);
    var acvm = (acvmax - acvmin)/2.0;
    var acvb = (acvmax + acvmin)/2.0;
    var acvrms = Math.sqrt(acvb*acvb+acvm*acvm/2);
    var acirms = acvrms / rmsr;
    var acpave = acvrms*acirms; 
    var acim = acvm / rmsr;
    var acib = acvb / rmsr;
    var acpavevi = acvb*acib+0.5*acvm*acim;
    var includepar1 = "";
    var includepar2 = "";
    if(acvmin < 0){
        includepar1 = "(";
        includepar2 = ")";
    }
    var acvbexp, acvmexp, acrmsexp, acrmsiexp, acvexp,aciexp,acpaveexp,acderive;
    if(acvmax > acvmin){
        DrawCosine(acvmax,acvmin,acphi,acperiod,acfreq,rmsr);
        acvmexp = "V_m=\\frac{V_{Max}-V_{Min}}{2}=\\frac{"+writeTripleLatex(acvmax,"V")+"-"+includepar1+writeTripleLatex(acvmin,"V")+includepar2+"}{2}="
            +writeTripleLatex(acvm,"V")+writeEng(acvm,"V",true,false,false);
        acvbexp = "V_B=\\frac{V_{Max}+V_{Min}}{2}=\\frac{"+writeTripleLatex(acvmax,"V")+"+"+includepar1+writeTripleLatex(acvmin,"V")+includepar2+"}{2}="
            +writeTripleLatex(acvb,"V")+writeEng(acvb,"V",true,false,false);
        acvexp = "v_s(t)=";
        aciexp = "i_s(t)=\\frac{v_s(t)}{R_{EQ}}=";
        acrmsexp = "V_{S,RMS}=\\sqrt{V_B^2+\\frac{V_m^2}{2}}=";
        acrmsiexp= "I_{S,RMS}=\\sqrt{I_B^2+\\frac{I_m^2}{2}}=";
        acpaveexp = "P_{AVE}=I_{RMS}V_{RMS}="+writeTripleLatex(acvrms,"V_{RMS}")+"\\times "+writeTripleLatex(acirms,"A_{RMS}")
            +"="+writeTripleLatex(acpave,"W")+writeEng(acpave,"W",true,false,false);
        acderive = "=";
        if(acvb == 0){
            acrmsexp += "\\frac{V_m}{\\sqrt{2}}=\\frac{"+writeTripleLatex(acvm,"V")+"}{\\sqrt{2}}=";
            acrmsiexp+= "\\frac{I_m}{\\sqrt{2}}=\\frac{"+writeTripleLatex(acim,"A")+"}{\\sqrt{2}}=";
        }
        else{
            acvexp += writeEng(acvb,"V",false,true,false)+"+";
            aciexp += writeEng(acib,"A",false,true,false)+"+";
            acrmsexp += "\\sqrt{("+writeTripleLatex(acvb,"V")+")^2+\\frac{("+writeTripleLatex(acvm,"V")+")^2}{2}}=";
            acrmsiexp+= "\\sqrt{("+writeTripleLatex(acib,"A")+")^2+\\frac{("+writeTripleLatex(acim,"A")+")^2}{2}}=";
            acderive += writeTripleLatex(acvb,"V")+"\\times"+writeTripleLatex(acib,"A")+"+";
        }
        acvexp += writeEng(acvm,"V",false,true,false,true,false)+"cos(360^\\circ\\times "+writeEng(acfreq,"Hz",false,true,false)+"\\times t+"
            +writeTripleLatex(acphi,"^\\circ",false,true,false)+")"+writeEng(acvm,"V",false,true,false,false,true);
        aciexp += writeEng(acim,"A",false,true,false,true,false)+"cos(360^\\circ\\times "+writeEng(acfreq,"Hz",false,true,false)+"\\times t+"
            +writeTripleLatex(acphi,"^\\circ",false,true,false)+")"+writeEng(acim,"A",false,true,false,false,true);
        acrmsexp += writeTripleLatex(acvrms,"V_{RMS}")+writeEng(acvrms,"V_{RMS}",true,false,false);
        acrmsiexp+= writeTripleLatex(acirms,"A_{RMS}")+writeEng(acirms,"A_{RMS}",true,false,false);
        acderive += "\\frac{" +writeTripleLatex(acvm,"V")+"\\times"+writeTripleLatex(acim,"A")+"}{2}="
            +writeTripleLatex(acpavevi,"W")+writeEng(acpavevi,"W",true,false,false);
    }
    else{
        var acerror = "\\text {Error: } V_{Max}\\ngtr V_{Min}";
        acvbexp = acerror;
        acvmexp = acerror;
        acrmsexp = acerror;
        acrmsiexp= acerror;
        acvexp = acerror;
        aciexp = acerror;
        acpaveexp = acerror;
        acderive = acerror;
    }
    var acohmsexp = "I_{S,RMS}=\\frac{V_{S,RMS}}{R_{EQ}}=\\frac{"+writeTripleLatex(acvrms,"V_{RMS}")+"}{"+writeTripleLatex(rmsr,"\\Omega")+"}="
        +writeTripleLatex(acirms,"A_{RMS}")+writeEng(acirms,"A_{RMS}",true,false,false);
    NewMathAtItem(acvmexp,"vmderived");
    NewMathAtItem(acvbexp,"vbderived");
    NewMathAtItem(acrmsexp,"acrms");
    NewMathAtItem(acrmsiexp,"acirms");
    NewMathAtItem(acohmsexp,"acohms");
    NewMathAtItem(acvexp, "acveqn");
    NewMathAtItem(aciexp, "acieqn");
    NewMathAtItem(acpaveexp,"acpave");
    NewMathAtItem(acderive,"acderive")
}

function ChangedRadar(){
    EnforceNumericalHTML("radarpt",minnorm,maxnorm);
    var pt = document.getElementById("radarpt").value * Math.pow(10,document.getElementById("radarptexp").value);
    EnforceNumericalHTML("radargain",mingain,maxgain);
    var gr = parseFloat(document.getElementById("radargain").value);
    var gsquaredtext = gr.toString()+"^2";
    EnforceNumericalHTML("radarrcs",minRCS,maxRCS);
    var rcs = parseFloat(document.getElementById("radarrcs").value);
    EnforceNumericalHTML("radarfreq",minnorm,maxnorm);
    var freq = document.getElementById("radarfreq").value * Math.pow(10,document.getElementById("radarfreqexp").value);
    EnforceNumericalHTML("radarrange",mindist,maxdist);
    var range = document.getElementById("radarrange").value * Math.pow(10,document.getElementById("radarrangeexp").value);
    var lambda = SOL/freq;
    var pr = pt*gr*gr*rcs*lambda*lambda/(FOURPICUBE*range*range*range*range);
    var radarexpression = "P_R=P_T G^2 RCS \\frac{\\lambda^2}{(4\\pi)^3 R^4}="+writeTripleLatex(pt,"W")+"\\times "+
                            gsquaredtext+"\\times "+writeTripleLatex(rcs,"m^2 ")+ "\\frac{("+writeTripleLatex(lambda,"m")+")^2}{(4\\pi)^3("+
                            writeTripleLatex(range,"m")+")^4}="+writeTripleLatex(pr,"W")+writeEng(pr,"W",true,false);
    NewMathAtItem(radarexpression,"radarpreqn");
    EnforceNumericalHTML("radarprmin",minnorm,maxnorm);
    var prminradar = parseFloat(document.getElementById("radarprmin").value) * Math.pow(10,document.getElementById("radarprminexp").value);
    var radarrmax = Math.sqrt(Math.sqrt(pt/prminradar*gr*gr*rcs*lambda*lambda/FOURPICUBE));
    var radarrmaxexpression = "R_{Radar}=R_{Max}=\\sqrt[4]{\\frac{P_T}{P_R}G^2 RCS \\frac{\\lambda^2}{(4\\pi)^3}}=\\sqrt[4]{\\frac{"+
                                writeTripleLatex(pt,"W")+"}{"+writeTripleLatex(prminradar,"W")+"}"+gsquaredtext+"\\times "+writeTripleLatex(rcs,"m^2 ")+
                                "\\frac{("+writeTripleLatex(lambda,"m")+")^2}{(4\\pi)^3}}="+writeTripleLatex(radarrmax,"m")+writeEng(radarrmax,"m",true,false);
    NewMathAtItem(radarrmaxexpression,"radarrmaxeqn");
    EnforceNumericalHTML("radarPRF",minnorm,maxnorm);
    var prf = parseFloat(document.getElementById("radarPRF").value)*Math.pow(10,document.getElementById("radarPRFexp").value);
    var pri = 1/prf;
    var rumax = 0.5*SOL*pri;
    var rumaxexpression = "R_U=\\frac{c}{2\\times PRF}=\\frac{3\\times 10^8 m/s}{2 \\times"+writeTripleLatex(prf,"Hz")+"}="+writeTripleLatex(rumax,"m")+writeEng(rumax,"m",true,false);
    NewMathAtItem(rumaxexpression,"radarrueqn");
    EnforceNumericalHTML("radarpw",minnorm,maxnorm);
    var pw = parseFloat(document.getElementById("radarpw").value)*Math.pow(10,document.getElementById("radarpwexp").value);
    var deltar = 0.5*SOL*pw;
    var deltarexpression = "\\Delta R=\\frac{c \\tau}{2}=\\frac{3\\times 10^8 m/s\\times"+writeTripleLatex(pw,"s")+"}{2}="+writeTripleLatex(deltar,"m")+writeEng(deltar,"m",true,false);
    NewMathAtItem(deltarexpression,"radarresolutioneqn");
    var grwr = GrabNumber("rwrgain","null",false,mingain,maxgain);
    var rwrprmin = GrabNumber("rwrprmin","rwrprminexp",true,minnorm,maxnorm);
    var rwrrange = lambda/(FOURPI)*Math.sqrt(pt/rwrprmin*grwr*gr);
    var rwrrangeexpression = "R_{RWR}=R_{Max}=\\frac{\\lambda}{4\\pi}\\sqrt{\\frac{P_T}{P_R}G_T G_R}=\\frac{"+writeTripleLatex(lambda,"m")+"}{4\\pi}\\sqrt{\\frac{"+writeTripleLatex(pt,"W")+"}{"+
                                writeTripleLatex(rwrprmin,"W")+"}"+gr.toString()+"\\times "+grwr.toString()+"}="+writeTripleLatex(rwrrange,"m")+writeEng(rwrrange,"m",true,false);
    NewMathAtItem(rwrrangeexpression,"radarrwreqn");
    var rheight = GrabNumber("radarheight","null",false,minvertical,maxvertical);
    var theight = GrabNumber("targetheight","null",false,minvertical,maxvertical);
    var rlos = 1610*(Math.sqrt(2*rheight)+Math.sqrt(2*theight));
    var lospart1 = Math.sqrt(rheight*2);
    var lospart2 = Math.sqrt(theight*2);
    var rloseqn = "R_{LOS}=\\sqrt{2 h_1}+\\sqrt{2 h_2}=\\sqrt{2\\times "+rheight.toString()+"}+\\sqrt{2\\times "+theight.toString()+"}=("+lospart1.toPrecision(4)+"mi+"+lospart2.toPrecision(4)+"mi)"+
                "\\times 1.61\\frac{km}{mi}="+writeEng(rlos,"m",false,true);
    NewMathAtItem(rloseqn,"radarloseqn");
    //now conclude with a message about the winner: 
    //\[ Max\begin{cases} Min(R_{LOS},R_{RWR}) \\ Min(R_{LOS},R_{Radar}) \end{cases}  \]
    //var minmaxmsg = " Max\\begin{cases} Min(R_{LOS},R_{RWR}) \\\\ Min(R_{LOS},R_{Radar}) \\end{cases}  ";

    var bestradar = Math.min(rlos,radarrmax);
    var bestrwr = Math.min(rlos,rwrrange);
    var bestoverall = Math.max(bestradar,bestrwr);

    var minmaxmsg = "Max\\begin{cases} Radar= & Min("+writeEng(rlos,"m")+","+writeEng(radarrmax,"m")+") \\\\ RWR= & Min("+
                     writeEng(rlos,"m")+","+writeEng(rwrrange,"m")+")\\end{cases}\\Rightarrow "+
                     "Max\\begin{cases} Radar= & "+writeEng(bestradar,"m")+"\\\\"+
                                       "RWR=   & "+writeEng(bestrwr,"m")+"\\end{cases}\\Rightarrow "+
                     writeEng(bestoverall,"m");
    NewMathAtItem(minmaxmsg,"minmaxmessage");

    var finalmsg ="<u>The following conclusions are true for this particular RADAR and Target: </u><br>";
    var b_loslimitsradar = false;
    if(rlos < radarrmax) b_loslimitsradar = true;
    var b_loslimitsrwr = false;
    if(rlos < rwrrange) b_loslimitsrwr = true;
    var b_tied = false;
    if(b_loslimitsradar == true && b_loslimitsrwr == true) b_tied = true;
    var b_ambiguous = false;
    if(rumax < bestradar) b_ambiguous = true;
    var b_radarwins = false;
    if(b_tied == false && bestradar > bestrwr) b_radarwins = true;

    //Tired of coming up with a dynamic paragraph? Me too.
    finalmsg += "<b>R<sub>RADAR</sub> = "+writeEng(radarrmax,"m",false,true)+"</b> ";
    if(b_loslimitsradar) finalmsg += "is limited by ";
    else finalmsg += "is not limited by ";
    finalmsg += "<b>R<sub>LOS</sub>="+writeEng(rlos,"m")+"</b>, so the RADAR can detect these targets out to a distance of <b>R<sub>Radar-Detection</sub>="+writeEng(bestradar,"m",false,true)+".</b><br>";
    if(b_ambiguous) finalmsg += "However targets beyond its Maximum Unambiguous Range <b>R<sub>U</sub>="+writeEng(rumax,"m",false,true)+"</b> will be ambiguously shown at incorrect ranges.<br>";
    else finalmsg += "Its range does not extend beyond its Maximum Unabmiguous Range <b>R<sub>U</sub>="+writeEng(rumax,"m",false,true)+"</b>, so all detectable targets will be shown at the correct range.<br>";
    finalmsg += "The Target's RWR Range <b>R<sub>RWR</sub>="+writeEng(rwrrange,"m",false,true)+"</b> ";
    if(b_loslimitsrwr) finalmsg += "is limited by ";
    else finalmsg += "is not limited by ";
    finalmsg += "<b>R<sub>LOS</sub>="+writeEng(rlos,"m",false,true)+"</b>, so the RWR can detect this kind of RADAR out to a distance of <b>R<sub>RWR-Detection</sub>="+writeEng(bestrwr,"m",false,true)+".</b><br>";
    if(b_tied) finalmsg += "Since both systems are limited by LOS there is a <b>TIE</b>";
    else{
        if(bestradar == bestrwr) finalmsg += "Coincidentally, both systems have equal detection ranges and there is a <b>TIE</b>";
        else if(bestradar > bestrwr){
            if(b_ambiguous) finalmsg += "Despite the presence of ambiguous returns, the <b>RADAR</b> system will detect the aircraft first.";
            else finalmsg += "The <b>RADAR</b> system will detect the aircraft first, and it will do so unambiguously";
        }
        else{
            finalmsg += "The <b>RWR</b> will detect the RADAR first.";
        }
    }
    document.getElementById("winnermessage").innerHTML = finalmsg;
    //"RADAR detections occurs at up to <b>"+MakeEngNotation(bestradar,"m")+"</b>. The clear-sky 
}

function ChangedDoppler(){
    var rttt = GrabNumber("radartime","radartimeexp",true,minnorm,maxnorm);
    var rangetotarget = 0.5*SOL*rttt;
    var radardistanceexp = "R=\\frac{c t}{2}=\\frac{3\\times10^8m/s\\times"+writeTripleLatex(rttt,"s")
                            +"}{2}="+writeTripleLatex(rangetotarget,"m")+
                            writeEng(rangetotarget,"m",true,false);
    NewMathAtItem(radardistanceexp,"radartimedistanceeqn");

    var onewaytraveltime = GrabNumber("radiotime","radiotimeexp",true,minnorm,maxnorm);
    var onewayrange = SOL*onewaytraveltime;
    var radiotimedistanceeqn = "R=c t=3\\times10^8m/s\\times"+writeTripleLatex(onewaytraveltime,"s")
                            +"="+writeTripleLatex(onewayrange,"m")+
                            writeEng(onewayrange,"m",true,false);
    NewMathAtItem(radiotimedistanceeqn,"radiotimedistanceeqn");

    var fzero = GrabNumber("radarFzero","radarFzeroexp",true,minnorm,maxnorm);
    var velocity = GrabNumber("radarvelocity","",false,-SOL,SOL);
    var dopplerangle = GrabNumber("radarangle","",false,minangle,maxangle);
    var angleinrads = dopplerangle*PI/180;
    var tofrom = parseFloat(document.getElementById("radartowards").value);
    var tofromtext = "+";
    if(tofrom < 0) tofromtext = "-";
    var freturn = fzero*(1+tofrom*2*velocity*Math.cos(angleinrads)/SOL);
    var fshift = freturn - fzero;
    var freturnexpression = "f_{R}=f_0[1\\pm\\frac{2v\\times cos(\\theta)}{c}]="+writeTripleLatex(fzero,"Hz")+
        "[1"+tofromtext+"\\frac{2\\times"+writeTripleLatex(velocity,"m/s")+"\\times cos("+dopplerangle.toString()+
        "^\\circ)}{3\\times10^8m/s}="+writeTripleLatex(freturn,"Hz",true)+writeEng(freturn,"Hz",true,false,true);
    NewMathAtItem(freturnexpression,"radarreturnfrequency");
    var returnshift = "\\Delta f=f_R-f_0="+writeTripleLatex(fshift,"Hz")+writeEng(fshift,"Hz",true,false);
    NewMathAtItem(returnshift,"radarreturnshift");

    var fshiftgiven = GrabNumber("radarShift","radarShiftexp",true,-maxnorm,maxnorm);
    var compvelocity = SOL/2*fshiftgiven/(fzero*Math.cos(angleinrads));
    var velocityexpression = "v=\\frac{c(f_R-f_0)}{2f_0cos(\\theta)}="+"\\frac{c\\times\\Delta f}{2f_0cos(\\theta)}="+
                "\\frac{3\\times10^8m/s\\times"+writeTripleLatex(fshiftgiven,"Hz")+
                "}{2\\times"+writeTripleLatex(fzero,"Hz")+"\\times cos("+dopplerangle.toString()+"^\\circ)}="+
                writeTripleLatex(compvelocity,"m/s");
    NewMathAtItem(velocityexpression,"radarcomputevelocity");
}

/**********************************DRAWING ON CANVAS***************************************************************/
var plotxstart, plotxend;
var plotystart, plotyend;
var plotxspan, plotyspan;
var plotxfirst, plotyfirst;
var plotpixw, plotpixh;
var plotxgridstep; //logical size, not pixel size
var plotygridstep;
var plotxzero; //pixel location of x=0
var plotyzero;
var plotgridstep, plotxpixgridstep, plotypixgridstep;
var plotctx;
var plotxfact, plotyfact;
var plotxpixelstep, plotypixelstep;
var plotislog;
var plotxlogleft;
var plotylogtop;
var plotxdecades;
var plotydecades;
var plotxpixperdecade;
var plotypixperdecade;
var plotleft, plotbottom;
var plotright, plottop;
const ArrayLength = maxsamples;
var plotdatax = new Array(ArrayLength);
var plotdatay = new Array(ArrayLength);
var plotdataypix = new Array(ArrayLength);
var plotxunit = "";
var plotyunit = "";

var sumofsig = new Array(ArrayLength);
var sumofsigt = new Array(ArrayLength);

function initPlot(xmin,ymin,xmax,ymax,canvaswidth,canvasheight,xgridstep,ygridstep,logged=false,left=0,right=0,top=0,bottom=0){
    //grids will get stretched unless you make the spans squared' up
    plotleft = left;
    plotright = right;
    plottop = top;
    plotbottom = bottom;
    if(xgridstep <= 0) plotxgridstep = 1;
    if(ygridstep <= 0) plotygridstep = 1;
    if(xmax <= xmin) return;
    if(ymax <= ymin) return;
    plotxstart = xmin; //translates to pixel pixxoffset
    plotystart = ymin;
    plotxend = xmax;
    plotyend = ymax;
    plotxspan = xmax-xmin;
    plotyspan = ymax-ymin;
    plotpixw = canvaswidth-plotleft-plotright;
    plotpixh = canvasheight-plotbottom-plottop;
    plotxfact = plotpixw/plotxspan;
    plotyfact = plotpixh/plotyspan;
    plotxgridstep = xgridstep;
    plotygridstep = ygridstep;
    plotxpixgridstep = plotxfact/xgridstep;
    plotypixgridstep = plotyfact/ygridstep;
    plotxzero = (-xmin)/(plotxspan)*plotpixw+left;
    plotyzero = top+(plotpixh-(-ymin)/(plotyspan)*plotpixh);
    plotxfirst = Math.round(plotxstart/plotxgridstep)*plotxgridstep;
    plotyfirst = Math.round(plotystart/plotygridstep)*plotygridstep;
    plotxpixelstep = (plotxspan)/plotpixw;
    plotypixelstep = (plotyspan)/plotpixh;
    plotislog = logged;
    if(plotislog){
        plotxdecades = Math.log10(xmax/xmin);
        plotydecades = Math.log10(ymax/ymin);
        plotxpixperdecade = plotpixw/plotxdecades;
        plotypixperdecade = plotpixh/plotydecades;
        plotxlogleft = Math.log10(xmin);
        plotylogtop  = Math.log10(ymax);
        plotxpixelstep = Math.pow(10,1/(plotxpixperdecade+1)); //use as a multiplier not an adder
        //then grid lines will be placed on decades (x10) change which are evenly spaced
    }
}

function GridSetAxisUnits(xname,yname){
    plotxunit = xname;
    plotyunit = yname;
}

var currentplotindex=0;

function BodeSlew(option){
    var xf, nf, df, i, upper = -1;
    if(option == 1 || option == -1){
        currentplotindex = currentplotindex + option;
    }
    else{
        switch(option){
            case 10:    
                xf = plotdatax[currentplotindex];
                nf = 10.0*xf;
                for(i = currentplotindex; i < plotpixw; i++){
                    if(plotdatax[i] > nf){
                        upper = i;
                        break;
                    }
                }
                if(upper == -1){  //not found
                    currentplotindex = plotpixw;
                }
            break;
            case -10:    
                xf = plotdatax[currentplotindex];
                nf = xf/10.0;
                for(i = currentplotindex; i > 0; i--){
                    if(plotdatax[i] < nf){
                        upper = i+1;
                        break;
                    }
                }
                if(upper == -1){  //not found
                    currentplotindex = 0;
                }
            break;
        }
        if(upper > -1){
            var a,b;
            a = Math.abs(plotdatax[upper-1]/nf-1);
            b = Math.abs(plotdatax[upper]/nf-1);
            if(a<b) currentplotindex = upper-1;
            else currentplotindex = upper;
        }
    }
    if(currentplotindex >= plotpixw) currentplotindex = plotpixw-1;
    if(currentplotindex < 0) currentplotindex = 0;
    LabelFrequencyResponse(null,true); ;
}

function LabelFrequencyResponse(event,manual=false){
    var canvas = document.getElementById("canvasBODE");
    if (canvas == null || !canvas.getContext){console.log("bad canvas"); return;} 
    var ctx = canvas.getContext("2d");
    var rect = canvas.getBoundingClientRect();
    var f1 = GrabNumber("FilterFreq1","FilterFreq1P",true,minnorm,maxnorm);
    var f2 = GrabNumber("FilterFreq2","FilterFreq2P",true,minnorm,maxnorm);
    var ymin=Math.pow(10,document.getElementById("BodeMinP").value);
    var ymax=Math.pow(10,document.getElementById("BodeMaxP").value);
    initPlot(f1,ymin,f2,ymax,canvas.width,canvas.height,(f2-f1)/40,(ymax-ymin)/20,true, 100,100,25,25);
    showGrid(ctx,true,false,true);
    PlotFrequencyResponse(ctx);
    var px, ix;
    if(manual){
        ix = currentplotindex;
        px = ix + plotleft;
    }
    else{
        px = event.clientX - rect.left;
        ix = px-plotleft;
        currentplotindex = px-plotleft;
    }
    var py = plotdataypix[ix]+plottop;

    var x = plotdatax[ix];
    var y = plotdatay[ix];
    ctx.font = "15px Helvetica";
    ctx.fillStyle = "black";
    ctx.textAlign = "right";

    ctx.fillRect(px-2,py-2,5,5);
    var labeltext1 = writeEng(x,"Hz",false,true);
    var labeltext2 = writeTripleString(y,"",false,false);
    var search = labeltext2.search('x');

    var exptext = "";
    if(search > -1){
        exptext = labeltext2.substr(search+4,labeltext2.length);
        labeltext2 = labeltext2.substr(0,search+3);
    }
    ctx.fillText(labeltext1,px+30,py+30);
    ctx.fillText(labeltext2,px+30,py+50);
    ctx.fillText(writeTripleString(y,"",true,false),px+30,py+70);
    //ctx.fillText("10",plotleft-15,py+5);
    ctx.textAlign = "left";
    ctx.font = "10px Helvetica";
    ctx.fillText(exptext,px+30,py+40);
}

function FillFrequencyResponse(R,L,C,topo){
    var omega, x, y, px, py, ix,iy;
    var gain = new Array(2);
    for(x = plotxstart; x <= plotxend; x*= plotxpixelstep){
        omega = 2*Math.PI*x;
        gain = GetResponse(R,L,C,omega,topo);
        y = gain[0];
        px = (Math.log10(x)-plotxlogleft)*plotxpixperdecade;
        py = (plotylogtop-Math.log10(y))*plotypixperdecade;
        ix = parseInt(px);
        iy = parseInt(py);
        plotdatax[ix] = x;
        plotdatay[ix] = y;
        plotdataypix[ix] = py;
    }
}

function PlotFrequencyResponse(ctx){
    var ix,px, py;
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    for(ix = 0; ix < plotpixw; ix++){
        py = plotdataypix[ix];
        ctx.lineTo(ix+plotleft,py+plottop);
    }
    ctx.stroke();
    ctx.closePath();
}

function PlotEvaldFunction(ctx,size,sumofsigt,sumofsig,color,connectdots=true,blockstyle=false,includedots=false,discretespikes=false){
    var ix, px, py;
    ctx.beginPath();
    if(discretespikes)
        ctx.lineWidth = 5;
    else
        ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    //ctx.moveTo(0,0);
    var lastpy = 0;
    for(var ix = 0; ix < size; ix++){
        px = plotxzero+sumofsigt[ix]*plotxfact;
        py = plotyzero-sumofsig[ix]*plotyfact;
        if(px >= plotleft && px <= plotleft+plotpixw){
            if(includedots){
                if(discretespikes && sumofsig[ix] > 0){
                    ctx.fillRect(px-2,py-2,5,5);
                }
                if(!discretespikes)
                    ctx.fillRect(px-2,py-2,5,5);
            }
            if(blockstyle){
                if(ix > 0) ctx.lineTo(px,lastpy);
                ctx.lineTo(px,py);
                lastpy = py;
            }
            else if(connectdots)
                ctx.lineTo(px,py);
            else if(discretespikes){
                ctx.moveTo(px,plotyzero);
                ctx.lineTo(px,py);
            }
        }
    }
    ctx.stroke();
    ctx.closePath();
}

function drawVector(ctx,r,i,x=0,y=0,color="red"){
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.moveTo(plotxzero+x*plotxfact,plotyzero-y*plotyfact);
    ctx.lineTo(plotxzero+x*plotxfact+r*plotxfact,plotyzero-y*plotyfact-i*plotyfact); //because +y is down in graphics
    //arrow?
    ctx.stroke();
    ctx.closePath();
}
function drawComplexCosine(ctx, A, phi, freq,color){
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    var x, y;
    var phirad = phi*Math.PI/180.0;
    y = A*Math.cos(plotxstart*freq*2*Math.PI+phirad);
    ctx.moveTo(0,y);
    for(x = plotxstart; x <= plotxend; x+=plotxpixelstep){
        y = A*Math.cos(x*freq*2*Math.PI+phirad);
        ctx.lineTo(x*plotxfact+plotxzero,plotyzero-y*plotyfact);
    }
    ctx.stroke();
    ctx.closePath();
}

function drawMyRLCCkt(){
    //do nothing :D
}

function drawLegend(ctx,number,names,colors){
    ctx.font = "20px Helvetica";
    ctx.textAlign = "left";
    for(var index = 0; index < number; index++){
        ctx.fillStyle = colors[index];
        ctx.fillText(names[index],10,24+index*24);
    }
}

function drawLabeledPoint(ctx,xpos,ypos,labeltext,xoffset,yoffset,alignright=false){
    var xpix = plotxzero+xpos*plotxfact;
    var ypix = plotyzero-ypos*plotyfact;
    ctx.font = "20px Helvetica";
    ctx.fillStyle = "black";
    if(alignright)
        ctx.textAlign = "right";
    else
        ctx.textAlign = "left";
    ctx.fillRect(xpix-2,ypix-2,5,5);
    ctx.fillText(labeltext,xpix+xoffset,ypix+yoffset+7);
}

function showGrid(ctx,gridsquares = true, tickmarks = false, includeaxes = false){
    //initPlot has to have been already done
    if(darkmode){
        ctx.fillstyle="#000000";
        ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
        ctx.fillStyle="#111111";
        ctx.fillRect(plotleft,plottop,plotpixw,plotpixh);
    }
    else{
        ctx.fillStyle="#dddddd";
        ctx.fillRect(0,0,plotpixw+plotleft+plotright,plotpixh+plotbottom+plotbottom);
        ctx.fillStyle="#77dddd";
        ctx.fillRect(plotleft,plottop,plotpixw,plotpixh);
    }
    var px, py, x, y;
    if(gridsquares){
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "gray";
        if(darkmode) ctx.strokeStyle = "#222222";
        ctx.font = "15px Helvetica";
        ctx.fillStyle = "black";
        if(darkmode) ctx.strokeStyle = "#444444";
        ctx.textAlign = "left";
        //start at the first xgridstep value above xstart. e.g. -4.5 start at -4. round up to next value by finding: xstart/xgridstep = 4
        if(plotislog){
            for(x = plotxstart; x <= plotxend; x*= 10){
                px = plotleft + (Math.log10(x)-Math.log10(plotxstart))*plotxpixperdecade;
                ctx.moveTo(px,plottop);   ctx.lineTo(px,plotpixh+plottop);
                ctx.fillText(writeEng(x,"Hz",false,true),px-5,plotpixh+plottop+20);
            }
            for(y = plotystart; y <= plotyend; y*= 10){
                py = plottop+(plotpixh-(Math.log10(y)-Math.log10(plotystart))*plotypixperdecade);
                ctx.moveTo(plotleft,py);   ctx.lineTo(plotleft+plotpixw,py);
                //ctx.fillText(writeEng(y,"",false,true),10,py-5);
                ctx.textAlign = "right";
                ctx.font = "15px Helvetica";
                ctx.fillText("10",plotleft-15,py+5);
                ctx.textAlign = "left";
                ctx.font = "10px Helvetica";
                ctx.fillText(Math.log10(y).toFixed(0),plotleft-15,py-5);
                ctx.font = "15px Helvetica";
                ctx.fillText(writeTripleString(y,"",true,false,0),5,py+5);
            }
        }
        else{
            ctx.textAlign = "right";
            ctx.font = "15px Helvetica";
            var minor = 5;
            for(x = plotxfirst; x <= plotxend; x+= plotxgridstep){
                px = plotleft+(x-plotxstart)*plotxfact;
                ctx.moveTo(px,plottop);   ctx.lineTo(px,plotpixh+plottop);
                if(minor == 5){
                    ctx.fillRect(px-1,plottop+plotpixh,3,10);
                    ctx.fillText(writeEng(x,plotxunit,false,true),px+30,plotpixh+plottop+25);
                    minor = 0;
                }
                minor++;
            }
            minor = 0;
            ctx.textAlign = "right";
            ctx.font = "15px Helvetica";

            for(y = 0; y >= plotystart; y-= plotygridstep){
                py = plotyzero-(y)*plotyfact;
                ctx.moveTo(plotleft,py);   ctx.lineTo(plotleft+plotpixw,py);

                if(minor == 0){
                    minor = 5;
                    ctx.fillRect(plotleft-6,py-1,6,3);
                    ctx.fillText(writeEng(y,plotyunit,false,true),plotleft-6,py+5);
                }
                minor--;
                
            }
            minor = 0;
            for(y = 0; y <= plotyend; y+= plotygridstep){
                py = plotyzero-(y)*plotyfact;
                ctx.moveTo(plotleft,py);   ctx.lineTo(plotleft+plotpixw,py);

                if(minor == 0){
                    minor = 5;
                    if(y > 0){
                        ctx.fillRect(plotleft-6,py-1,6,3);
                        ctx.fillText(writeEng(y,plotyunit,false,true),plotleft-6,py+5);
                    }
                }
                minor--;
            }
        }
        ctx.stroke();
        ctx.closePath();
    }
    if(includeaxes){
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black"; 
        if(plotislog){
            //skip the zero's?
        }
        else{
            if(plotxzero >= plotleft && plotxzero < plotleft+plotpixw){
                ctx.moveTo(plotxzero,plottop);    ctx.lineTo(plotxzero,plottop+plotpixh);  // Y axis at x=0
            }
            if(plotyzero >= plottop && plotxzero < plottop+plotpixh){
                ctx.moveTo(plotleft,plotyzero);    ctx.lineTo(plotleft+plotpixw,plotyzero);  // X axis at y=0
            }
        }
        ctx.stroke();
        ctx.closePath();
    } 
}

function showAxes(ctx,axes) {
    var x0=axes.x0, w=ctx.canvas.width;
    var y0=axes.y0, h=ctx.canvas.height;
    ctx.beginPath();
    ctx.strokeStyle = "rgb(128,128,128)"; 
    ctx.moveTo(0,y0);    ctx.lineTo(w,y0);  // X axis
    ctx.moveTo(x0,0);    ctx.lineTo(x0,h);  // Y axis
    ctx.stroke();
}
function DrawLabeledLine(ctx,pixel,textvalue,horizontal=true){
    ctx.beginPath();
    ctx.setLineDash([5, 15]);
    ctx.strokeStyle ="rgb(0,0,128)";
    if(horizontal==true){
        ctx.moveTo(0,pixel);
        ctx.lineTo(ctx.canvas.width, pixel);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "20px Arial";
        ctx.fillStyle = 'blue';
        ctx.fillText(textvalue,10,pixel-5);
    }
    else{
        var arrowdelta = 3;
        if(pixel > ctx.canvas.width/2)
            arrowdelta = -3;
        ctx.moveTo(pixel,0);
        ctx.lineTo(pixel, ctx.canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle ="rgb(128,0,0)";
        ctx.setLineDash([]);
        ctx.moveTo(ctx.canvas.width/2,54);
        ctx.lineTo(pixel,54);
        ctx.lineTo(pixel+arrowdelta,57);
        ctx.moveTo(pixel,54);
        ctx.lineTo(pixel+arrowdelta,51);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "20px Arial";
        ctx.fillStyle = 'red';
        ctx.fillText(textvalue,pixel+5,50);
    }
}
function VoltageToPixel(voltage,Kvalue,Bvalue){
    var result= voltage*Kvalue+Bvalue;
    return result;
}
function DrawCosine(acvmax,acvmin,acphi,acperiod,acfreq, rmsr){
    //somewhat from  http://www.ecircuitcenter.com/Calc/draw_sine1/draw_sine_canvas1.htm
    var canvas = document.getElementById("ACcanvas");
    var pcan = document.getElementById("ACcanvasPower");
    if (canvas == null || !canvas.getContext) return;
    if (pcan == null || !pcan.getContext) return;
    var ctx = canvas.getContext("2d");
    var ctxp = pcan.getContext("2d");
    ctx.fillStyle="#dddddd";
    ctxp.fillStyle="#dddddd";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctxp.fillRect(0,0,pcan.width,pcan.height);
    var acvbias = (acvmax + acvmin)/2.0;
    var acvm    = (acvmax - acvmin)/2.0;
    var acvrms = Math.sqrt(acvbias*acvbias+acvm*acvm/2);
    //var acphi   = actau/acperiod*360.0;
    var actau = acphi/360.0*acperiod;
    var numpoints = canvas.width;
    var numwaves = 4;
    var tstart = -2.0*acperiod;
    var deltat = acperiod*numwaves/numpoints;
    var tend   = tstart + deltat*numpoints;
    var canvasvmin = acvmin-acvm/2.0;
    var canvasvmax = acvmax+acvm/2.0;
    var powermax = (acvbias+acvm)*(acvbias+acvm)/rmsr;
    var othermax = (acvbias-acvm)*(acvbias-acvm)/rmsr;
    if (othermax > powermax) powermax = othermax;
    var powerave = acvrms*acvrms/rmsr;
    var powermin = 0;
    var powergraphmax = 1.25*powermax;
    var powergraphmin = -0.25*powermax;
    var pcanK   = pcan.height/(powergraphmin-powergraphmax);
    var pcanB   = pcan.height - pcanK*powergraphmin;
    var canvasK = canvas.height/(canvasvmin-canvasvmax);
    var canvasB = canvas.height - canvasK*canvasvmin;
    var timeK = canvas.width/(tend-tstart);
    var timeB = canvas.width - timeK*tend;
    var axes={};
    axes.x0 = 0.5 + 0.5*canvas.width;
    axes.y0 = canvasB;
    showAxes(ctx,axes);
    axes.y0 = pcanB;
    showAxes(ctxp,axes);
    var cosinex=new Array();
    var cosiney=new Array();
    var powery =new Array();
    ctx.beginPath(); //linewidth, strokestyle?
    ctxp.beginPath();
    var xp, yp, pp;
    for(var i = 0; i < numpoints; i++){
        cosinex[i]=tstart+i*deltat;
        cosiney[i]=acvbias+acvm*Math.cos(2*PI*acfreq*cosinex[i]+acphi*PI/180.0);
        powery[i] =cosiney[i]*cosiney[i]/rmsr;
        xp = cosinex[i]*timeK+timeB;
        yp = cosiney[i]*canvasK+canvasB;
        pp = powery[i]*pcanK+pcanB;
        if(i == 0){ ctx.moveTo(xp,yp); ctxp.moveTo(xp,pp);  }
        else{        ctx.lineTo(xp,yp); ctxp.lineTo(xp,pp); }
    }
    ctx.stroke();
    ctxp.stroke();
    DrawLabeledLine(ctx,VoltageToPixel(acvmax,canvasK,canvasB),writeEng(acvmax,"V",false,true,false));
    DrawLabeledLine(ctx,VoltageToPixel(acvmin,canvasK,canvasB),writeEng(acvmin,"V",false,true,false));
    DrawLabeledLine(ctx,VoltageToPixel(acvrms,canvasK,canvasB),writeEng(acvrms,"Vrms",false,true,false));
    DrawLabeledLine(ctx,(-actau)*timeK+timeB,acphi+"\u00B0",false);
    DrawLabeledLine(ctxp,powermax*pcanK+pcanB,"P_max="+writeEng(powermax,"W",false,true,false));
    DrawLabeledLine(ctxp,powerave*pcanK+pcanB,"P_ave="+writeEng(powerave,"W",false,true,false));
}


function getBaseLog(x, y) {
    return Math.log(y) / Math.log(x);
  }
//generic compute dish gain
function ComputeDishGain(radius, wavelength, eta){
    //check for valid numbers and then return
    if(isNaN(radius)) return 0;
    if(isNaN(wavelength)) return 0;
    if(isNaN(eta)) return;
    if(wavelength <= 0) return 0;
    if(radius <= 0) return 0;
    if(eta <= 0) return 0;
    return eta*(TWOPI*radius)*(TWOPI*radius)/(wavelength*wavelength);
}
function ChangedComm(){
    //1. look at the frequency and compute wavelength for it.
    EnforceNumericalHTML("commfreqarg",minnorm,maxnorm);
    var newarg = document.getElementById("commfreqarg").value;
    var newexp = document.getElementById("commfreqexp").value;
    freq = newarg * Math.pow(10,newexp);
    wavelength = SOL/freq;
    var ff = writeEng(freq,"Hz",false,true);
    var ww = writeEng(wavelength, "m",false,true);
    var wavelengthexpression = "\\lambda=\\frac{c}{f}=\\frac{3 \\times 10^8 m/s}{"+ff+"}="+ww;
    NewMathAtItem(wavelengthexpression,"lambdaeqn");

    //2. check the tx dish type and compute as necessary
    tx_antenna_type = parseInt(document.getElementById("transmittertype").value);
    document.getElementById("txlengthtext").hidden = false;
    document.getElementById("txantennalength").hidden = false;
    document.getElementById("txantennaexp").hidden = false;
    document.getElementById("txetatext").hidden = true;
    document.getElementById("txdisheta").hidden = true;
    document.getElementById("txgain").disabled = true;
    document.getElementById("txantennalength").disabled = true;
    if(tx_antenna_type == 1){ //DIPOLE - computer provides gain and length
        document.getElementById("txlengthtext").textContent = "Dipole length: ";
        gain_tx = 1.64;
        document.getElementById("txgain").value = gain_tx;
        //use 1/2 wavelength
        var alength = wavelength/2.0;
        SetLengthHTML(alength,"txantennalength","txantennaexp");
    }
    else if(tx_antenna_type == 2){ //MONOPOLE - computer provides gain and length
        document.getElementById("txlengthtext").textContent = "Monopole length: ";
        gain_tx = 3.28;
        document.getElementById("txgain").value = gain_tx;
        //use 1/4 wavelength
        var alength = wavelength/4.0;
        SetLengthHTML(alength,"txantennalength","txantennaexp");
    }
    else if(tx_antenna_type == 3){ //PARABOLIC - user input radius and eta, computer gives gain if those are values
        document.getElementById("txlengthtext").textContent = "Radius (not diameter): ";
        document.getElementById("txetatext").hidden = false;
        document.getElementById("txdisheta").hidden = false;
        document.getElementById("txantennalength").disabled = false;
        EnforceNumericalHTML("txantennalength",minnorm,maxnorm);
        var exp = parseFloat(document.getElementById("txantennaexp").value);
        tx_antenna_length = document.getElementById("txantennalength").value * Math.pow(10,exp);
        EnforceNumericalHTML("txdisheta",0,1);
        tx_antenna_eta = document.getElementById("txdisheta").value;
        gain_tx = ComputeDishGain(tx_antenna_length,wavelength,tx_antenna_eta);
        document.getElementById("txgain").value = gain_tx;
    }
    else{
        document.getElementById("txlengthtext").hidden = true;
        document.getElementById("txantennalength").hidden = true;
        document.getElementById("txantennaexp").hidden = true;
        document.getElementById("txgain").disabled = false;
        EnforceNumericalHTML("txgain",mingain,maxgain);
        gain_tx = document.getElementById("txgain").value;
    }
    //3. check the rx dish type and compute as well
    rx_antenna_type = parseInt(document.getElementById("receivertype").value);
    document.getElementById("rxlengthtext").hidden = false;
    document.getElementById("rxantennalength").hidden = false;
    document.getElementById("rxantennaexp").hidden = false;
    document.getElementById("rxetatext").hidden = true;
    document.getElementById("rxdisheta").hidden = true;
    document.getElementById("rxgain").disabled = true;
    document.getElementById("rxantennalength").disabled = true;
    if(rx_antenna_type == 1){ //DIPOLE - computer provides gain and length
        document.getElementById("rxlengthtext").textContent = "Dipole length: ";
        gain_rx = 1.64;
        document.getElementById("rxgain").value = gain_rx;
        //use 1/2 wavelength
        var alength = wavelength/2.0;
        SetLengthHTML(alength,"rxantennalength","rxantennaexp");
    }
    else if(rx_antenna_type == 2){ //MONOPOLE - computer provides gain and length
        document.getElementById("rxlengthtext").textContent = "Monopole length: ";
        gain_rx = 3.28;
        document.getElementById("rxgain").value = gain_rx;
        //use 1/4 wavelength
        var alength = wavelength/4.0;
        SetLengthHTML(alength,"rxantennalength","rxantennaexp");
    }
    else if(rx_antenna_type == 3){ //PARABOLIC - user input radius and eta, computer gives gain if those are values
        document.getElementById("rxlengthtext").textContent = "Radius (not diameter): ";
        document.getElementById("rxetatext").hidden = false;
        document.getElementById("rxdisheta").hidden = false;
        document.getElementById("rxantennalength").disabled = false;
        EnforceNumericalHTML("rxantennalength",1,999);
        var exp = parseFloat(document.getElementById("rxantennaexp").value);
        rx_antenna_length = document.getElementById("rxantennalength").value * Math.pow(10,exp);
        EnforceNumericalHTML("rxdisheta",0,1);
        rx_antenna_eta = document.getElementById("rxdisheta").value;
        gain_rx = ComputeDishGain(rx_antenna_length,wavelength,rx_antenna_eta);
        document.getElementById("rxgain").value = gain_rx;
    }
    else{
        document.getElementById("rxlengthtext").hidden = true;
        document.getElementById("rxantennalength").hidden = true;
        document.getElementById("rxantennaexp").hidden = true;
        document.getElementById("rxgain").disabled = false;
        EnforceNumericalHTML("rxgain",mingain,maxgain);
        gain_rx = document.getElementById("rxgain").value;
    }

    //4. Compute Friis
    EnforceNumericalHTML("friisrange",mindist,maxdist);
    friis_range = document.getElementById("friisrange").value * Math.pow(10,document.getElementById("friisrangeexp").value);
    EnforceNumericalHTML("powertransmitted",minnorm,maxnorm);
    friis_p_t = document.getElementById("powertransmitted").value * Math.pow(10,document.getElementById("powertransmittedexp").value);
    var pt, gt, gr, rr, ll,pr,prneat;
    pt = writeTripleLatex(friis_p_t,"W");
    gt = writeTripleLatex(gain_tx);
    gr = writeTripleLatex(gain_rx);
    ll = writeTripleLatex(wavelength,"m");
    rr = writeTripleLatex(friis_range,"m");
    friis_p_r = friis_p_t*gain_tx*gain_rx*wavelength*wavelength/(FOURPI*FOURPI*friis_range*friis_range);
    pr = writeTripleLatex(friis_p_r,"W");
    prneat = writeEng(friis_p_r,"W",false,true);
    var friisexpression = "P_R=P_T G_T G_R {\\lambda^2 \\over (4 \\pi R)^2}="
                           +pt+"\\times "+gt+"\\times "+gr+"\\frac{("+ll+")^2}{(4\\pi \\times "+rr+")^2}="
                           +pr+"="+prneat;
    NewMathAtItem(friisexpression,"friiseqn");

    //5. Compute R_max
    EnforceNumericalHTML("prminvalue",minnorm,maxnorm);
    friis_p_r_min = document.getElementById("prminvalue").value * Math.pow(10,document.getElementById("prminexp").value);
    var prmin = writeTripleLatex(friis_p_r_min,"W");
    friis_r_max = wavelength/(FOURPI)*Math.sqrt(friis_p_t/friis_p_r_min*gain_tx*gain_rx);
    var rmaxtriple = writeTripleLatex(friis_r_max,"m");
    var rmaxeng = writeEng(friis_r_max,"m",true,false);
    var rmaxexpression = "R_{Friis}=R_{Max}={\\lambda \\over 4 \\pi}\\sqrt{{P_T \\over P_{Rmin}}G_T G_R}="+
                         "\\frac{"+ll+"}{4\\pi}\\sqrt{\\frac{"+pt+"}{"+prmin+"}"+gt+"\\times "+gr+"}="+
                         rmaxtriple+rmaxeng;
    NewMathAtItem(rmaxexpression,"rmaxeqn");

    //6. Compute Lines-of-sight
    var rmiles,tmiles,miles, dtmiles, drmiles,displaymiles, tkms, rkms, kms, displaykms;
    EnforceNumericalHTML("txheight",minvertical,maxvertical);
    height_tx = parseFloat(document.getElementById("txheight").value);
    tmiles = Math.sqrt(2*height_tx); //miles first, set HTML
    dtmiles = tmiles.toPrecision(4);
    tkms = tmiles*1.61;
    displaykms = tkms.toPrecision(4);
    los_tx = tkms*1000;
    document.getElementById("txrlosmi").textContent = dtmiles.toString();
    document.getElementById("txrloskm").textContent = displaykms.toString();

    EnforceNumericalHTML("rxheight",minvertical,maxvertical);
    height_rx = parseFloat(document.getElementById("rxheight").value);
    rmiles = Math.sqrt(2*height_rx); //miles first, set HTML
    drmiles = rmiles.toPrecision(4);
    rkms = rmiles*1.61;
    displaykms = rkms.toPrecision(4);
    los_rx = rkms*1000;
    document.getElementById("rxrlosmi").textContent = drmiles.toString();
    document.getElementById("rxrloskm").textContent = displaykms.toString();

    los_total = los_tx + los_rx; //in meters

    miles = rmiles + tmiles;
    displaymiles = miles.toPrecision(4);
    kms = miles*1.61;
    displaykms = kms.toPrecision(4);
    
    var rlosexpression = "R_{LOS}=\\sqrt{2h_1}+\\sqrt{2h_2}=\\sqrt{2\\times "+height_tx+"}+\\sqrt{2\\times "+height_rx+"}=("+
                        dtmiles+" mi +"+drmiles+" mi) \\times 1.61\\frac{km}{mi}="+displaykms+" km";
    NewMathAtItem(rlosexpression,"rloseqn");

    //7. Determine at what range communication is possible for the two heights and the Pt/Pr_min scenario
    comm_range_viable = Math.min(los_total, friis_r_max);
    var commexpression = "R_{Comm}=Min(R_{LOS},R_{Friis})=";
    var los_total_text = writeEng(los_total,"m");
    var friis_range_text = writeEng(friis_r_max,"m");
    if(los_total < friis_r_max){
        commexpression += los_total_text;
    }
    else{
        commexpression += rmaxtriple + "="+friis_range_text;
    }
    NewMathAtItem(commexpression,"rcommeqn");

    ChangedCommPicture(true);

    UpdateCanvas(); //go to the drawing function

}

function ChangedCommPicture(pullfromupperhalf=false){
    //if pullfromupperhalf == true, then we will not call "ChangedInput()" and instead pull data from above to here
    //else, this was a button click in the lower half and we will push all data from the lower to the upper half (values only, not visibility)
    if(pullfromupperhalf == true){
        document.getElementById("lowerfreq").value = document.getElementById("commfreqarg").value;
        document.getElementById("lowerfreqexp").value = document.getElementById("commfreqexp").value;
        document.getElementById("lowertxheight").value = document.getElementById("txheight").value;
        document.getElementById("lowerrxheight").value = document.getElementById("rxheight").value;
        document.getElementById("lowerpowertrans").value = document.getElementById("powertransmitted").value;
        document.getElementById("lowerpowertransexp").value = document.getElementById("powertransmittedexp").value;
        document.getElementById("lowerprmin").value = document.getElementById("prminvalue").value;
        document.getElementById("lowerprminexp").value = document.getElementById("prminexp").value;
        //antenna settings :(
        document.getElementById("lowertxtype").value = document.getElementById("transmittertype").value;
        document.getElementById("lowertxtext").textContent = document.getElementById("txlengthtext").textContent;
        document.getElementById("lowertxtext").hidden = document.getElementById("txlengthtext").hidden;
        document.getElementById("lowertxlength").value = document.getElementById("txantennalength").value;
        document.getElementById("lowertxlength").hidden = document.getElementById("txantennalength").hidden;
        document.getElementById("lowertxlength").disabled = document.getElementById("txantennalength").disabled;
        document.getElementById("lowertxexp").value = document.getElementById("txantennaexp").value;
        document.getElementById("lowertxexp").hidden = document.getElementById("txantennaexp").hidden;
        document.getElementById("lowertxeta").value = document.getElementById("txdisheta").value;
        document.getElementById("lowertxeta").hidden = document.getElementById("txdisheta").hidden;
        document.getElementById("lowertxetatext").hidden = document.getElementById("txetatext").hidden;
        document.getElementById("lowertxgain").value = document.getElementById("txgain").value;
        document.getElementById("lowertxgain").disabled = document.getElementById("txgain").disabled;
        //receivers :whoooa
        document.getElementById("lowerrxtype").value = document.getElementById("receivertype").value;
        document.getElementById("lowerrxtext").textContent = document.getElementById("rxlengthtext").textContent;
        document.getElementById("lowerrxtext").hidden = document.getElementById("rxlengthtext").hidden;
        document.getElementById("lowerrxlength").value = document.getElementById("rxantennalength").value;
        document.getElementById("lowerrxlength").hidden = document.getElementById("rxantennalength").hidden;
        document.getElementById("lowerrxlength").disabled = document.getElementById("rxantennalength").disabled;
        document.getElementById("lowerrxexp").value = document.getElementById("rxantennaexp").value;
        document.getElementById("lowerrxexp").hidden = document.getElementById("rxantennaexp").hidden;
        document.getElementById("lowerrxeta").value = document.getElementById("rxdisheta").value;
        document.getElementById("lowerrxeta").hidden = document.getElementById("rxdisheta").hidden;
        document.getElementById("lowerrxetatext").hidden = document.getElementById("rxetatext").hidden;
        document.getElementById("lowerrxgain").value = document.getElementById("rxgain").value;
        document.getElementById("lowerrxgain").disabled = document.getElementById("rxgain").disabled;
        //end. this is the bottom of the top-down flow of information
    }
    else{
        EnforceNumericalHTML("lowerfreq",minnorm,maxnorm);
        document.getElementById("commfreqarg").value = document.getElementById("lowerfreq").value;
        document.getElementById("commfreqexp").value = document.getElementById("lowerfreqexp").value;
        EnforceNumericalHTML("lowertxheight",minvertical,maxvertical);
        document.getElementById("txheight").value = document.getElementById("lowertxheight").value;
        EnforceNumericalHTML("lowerrxheight",minvertical,maxvertical);
        document.getElementById("rxheight").value = document.getElementById("lowerrxheight").value;
        EnforceNumericalHTML("lowerpowertrans",minnorm,maxnorm);
        document.getElementById("powertransmitted").value = document.getElementById("lowerpowertrans").value;
        document.getElementById("powertransmittedexp").value = document.getElementById("lowerpowertransexp").value;
        EnforceNumericalHTML("lowerprmin",minnorm,maxnorm);
        document.getElementById("prminvalue").value = document.getElementById("lowerprmin").value;
        document.getElementById("prminexp").value = document.getElementById("lowerprminexp").value;
        
        //only copy values from the lower half and upper half logic will flow back down once
        document.getElementById("transmittertype").value = document.getElementById("lowertxtype").value;
        EnforceNumericalHTML("lowertxlength",minnorm,maxnorm);
        document.getElementById("txantennalength").value = document.getElementById("lowertxlength").value;
        document.getElementById("txantennaexp").value = document.getElementById("lowertxexp").value;
        EnforceNumericalHTML("lowertxeta",0,1);
        document.getElementById("txdisheta").value = document.getElementById("lowertxeta").value;
        EnforceNumericalHTML("lowertxgain",mingain,maxgain);
        document.getElementById("txgain").value = document.getElementById("lowertxgain").value;

        document.getElementById("receivertype").value = document.getElementById("lowerrxtype").value;
        EnforceNumericalHTML("lowerrxlength",minnorm,maxnorm);
        document.getElementById("rxantennalength").value = document.getElementById("lowerrxlength").value;
        document.getElementById("rxantennaexp").value = document.getElementById("lowerrxexp").value;
        EnforceNumericalHTML("lowerrxeta",0,1);
        document.getElementById("rxdisheta").value = document.getElementById("lowerrxeta").value;
        EnforceNumericalHTML("lowerrxgain",mingain,maxgain);
        document.getElementById("rxgain").value = document.getElementById("lowerrxgain").value;
        
        //call for the top-down flow
        ChangedComm();
    }
}

//******************************************************************* EARTH DRAWING ****************************************** */
var earthsize = 4;
var heightfttopixel = 200;
var sharpness = 0.2;
function ChangeEarth(growthdir){
    if(growthdir > 0){
        earthsize *= 0.9;
    }
    else{
        earthsize *= 1.1;
    }
    UpdateCanvas();
}
function ChangeHeights(growthdir){
    if(growthdir > 0){
        heightfttopixel *= 0.9;
    }
    else{
        heightfttopixel *= 1.1;
    }
    UpdateCanvas();
}
function ChangeGainArc(growthdir){
    if(growthdir > 0){
        sharpness *= 1.05;
    }
    else{
        sharpness *= 0.95;
    }
    UpdateCanvas();
}
function UpdateCanvas(){
    var thecanvas = document.getElementById("TheCanvas");
    var ctx = thecanvas.getContext("2d");
    //clears the canvas
    var canvas_width = thecanvas.width;
    var canvas_height = thecanvas.height;
    ctx.clearRect(0,0,canvas_width,canvas_height);
    ctx.fillStyle = "white";
    ctx.fillRect(0,0,canvas_width,canvas_height);

    var pix_mid_x = canvas_width / 2;
    var pix_mid_y = canvas_height / 2;
    var pix_earth_rad = canvas_height*earthsize; //get a slider for this
    var pix_max_x = canvas_width;
    var pix_max_y = canvas_height; //top-down for y coords
    var pix_height_tx = height_tx / heightfttopixel;
    var pix_height_rx = height_rx / heightfttopixel;
    var pix_hyp_tx = pix_height_tx + pix_earth_rad;
    var pix_hyp_rx = pix_height_rx + pix_earth_rad;
    var pix_los_x1 = Math.sqrt((pix_hyp_tx*pix_hyp_tx)-(pix_earth_rad*pix_earth_rad));   
    var pix_los_x2 = Math.sqrt((pix_hyp_rx*pix_hyp_rx)-(pix_earth_rad*pix_earth_rad));  
    var pix_los_total = pix_los_x1 + pix_los_x2;
    var pix_tx_x = pix_mid_x - pix_los_x1;
    var pix_tx_y = pix_mid_y;
    var pix_rx_x = pix_mid_x + pix_los_x2;
    var pix_rx_y = pix_mid_y;

    //compute the R_Friis by scaling R_LOS and draw a friis circle
    //use gradient fill
    var pix_friis_rmax;
    var oldmulti = multiplier;
    multiplier = pix_los_total / los_total;
    if(los_total < 1.0){
        multiplier = oldmulti;
        console.log("drawing is incorrect when both heights are 0'");
    }
    pix_friis_rmax= friis_r_max*multiplier;
    var gradient = ctx.createRadialGradient(pix_tx_x,pix_tx_y,0,pix_tx_x,pix_tx_y,pix_friis_rmax);
    var outercolor = 'rgb(255, 255, 200)';
    var innercolor = 'rgb(255, 165, 0)';
    gradient.addColorStop(0,innercolor);
    gradient.addColorStop(1,outercolor);
    ctx.strokeStyle = outercolor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pix_tx_x,pix_tx_y,pix_friis_rmax,0,TWOPI); //
    ctx.stroke();
    ctx.fillStyle = gradient;
    ctx.fill();
    //for gain sharpness, draw segments to block this orange-ish cloud
    //compute the angle in 0..PI from the 270-degree point
    var factor = 1.0-1/Math.pow(gain_tx,sharpness);
    var upperrad = PI+factor*PI;
    var lowerrad = PI-factor*PI;
    var arc_x = pix_tx_x + pix_friis_rmax*Math.cos(upperrad);
    var arc_y_upper = pix_tx_y + pix_friis_rmax*Math.sin(upperrad);
    var arc_y_lower = pix_tx_y + pix_friis_rmax*Math.sin(lowerrad);
    //draw rects and triangles to show a gain pattern (pacman style)
    ctx.fillStyle = "white";
    var rect_x = Math.min(arc_x,pix_tx_x);
    ctx.fillRect(0,0,rect_x+1,pix_max_y);
    if(upperrad <= 1.5*PI){
        ctx.beginPath();
        ctx.moveTo(pix_tx_x,pix_tx_y);
        ctx.lineTo(arc_x,arc_y_upper);
        ctx.lineTo(arc_x,arc_y_lower);
        ctx.fill();
    }
    else{
        ctx.fillRect(0,0,arc_x,arc_y_upper);
        ctx.fillRect(0,arc_y_lower,arc_x,pix_max_y-arc_y_lower+1);
        ctx.beginPath();
        ctx.moveTo(pix_tx_x,pix_tx_y);
        ctx.lineTo(arc_x,arc_y_upper);
        ctx.lineTo(pix_tx_x,arc_y_upper);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pix_tx_x,pix_tx_y);
        ctx.lineTo(arc_x,arc_y_lower);
        ctx.lineTo(pix_tx_x,arc_y_lower);
        ctx.fill();
    }
    //gray out the invisible region of the gain pattern blocked by earth
    if(friis_r_max > los_total){
        var xsize = pix_friis_rmax - (pix_mid_x - pix_tx_x);
        ctx.fillRect(pix_mid_x,pix_mid_y,pix_mid_x,pix_mid_y);
    }

    //draw the tangent behind Earth for visibility
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0,pix_mid_y);
    ctx.lineTo(pix_max_x,pix_mid_y);
    ctx.stroke();

    //draw the visibility tangent which has length R_LOS_MAX - use this value to scale the Friis circle
    ctx.strokeStyle = "red";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(pix_tx_x,pix_tx_y);
    ctx.lineTo(pix_rx_x,pix_rx_y);
    ctx.stroke();

    //draw a curved Earth surface
    ctx.strokeStyle = "green";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pix_mid_x,pix_mid_y+pix_earth_rad,pix_earth_rad,0,TWOPI);
    ctx.stroke();
    ctx.fillStyle = "green";
    ctx.fill();

    //draw curves for transmitters
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pix_mid_x,pix_mid_y+pix_earth_rad,pix_earth_rad+pix_height_tx,PI,1.5*PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pix_mid_x,pix_mid_y+pix_earth_rad,pix_earth_rad+pix_height_rx,1.5*PI,TWOPI);
    ctx.stroke();

    //draw text for solutions, starting with Line of Sight just below middle of screen
    ctx.font = "30px Arial";
    ctx.fillStyle = "black";
    var dkms = los_total/1000;
    var rlostext = dkms.toPrecision(4)+"km";
    ctx.fillText("Maximum LOS Range is "+rlostext, pix_mid_x-250, pix_mid_y+40);
    //friis range, near the transmitter
    ctx.font = "30px Arial";
    ctx.fillStyle = "black";
    var friiskms = friis_r_max/1000;
    var friistext = friiskms.toPrecision(4)+"km";
    ctx.fillText("Friis Propagation Range is "+friistext, pix_tx_x, pix_mid_y-140);
    //Tx and Rx at locations
    ctx.fillText("Tx",pix_tx_x-50,pix_tx_y-5);
    ctx.fillText("Rx",pix_rx_x+10,pix_tx_y-5);
    //replicate friis range as a line
    ctx.strokeStyle = "red";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(pix_tx_x,pix_tx_y-100);
    ctx.lineTo(pix_tx_x+pix_friis_rmax,pix_rx_y-100);
    ctx.stroke();
    //draw comm range
    var pix_comm_range = Math.min(pix_friis_rmax,pix_los_total);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(pix_tx_x,pix_tx_y+100);
    ctx.lineTo(pix_tx_x+pix_comm_range,pix_rx_y+100);
    ctx.stroke();
    var commtext = (comm_range_viable/1000).toPrecision(4)+"km";
    ctx.fillText("Communication occurs at up to "+commtext, pix_tx_x, pix_mid_y+140);
}