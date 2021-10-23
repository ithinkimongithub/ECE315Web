"use strict";

function isEven(number){
    var mod = number%2;
    if(mod > 0) return true;
    return false;
}

function InitPage(){
    console.log("InitPage");
    UpdatePage();
}

function GrabNumberPair(idbase, idexp){
    var base = parseFloat(document.getElementById(idbase).value);
    var exp  = parseFloat(document.getElementById(idexp).value);
    return base*Math.pow(10,exp);
}
function GrabIndexedPair(baseset, expset, index){
    var base = parseFloat(baseset[index].value);
    var exp  = parseFloat(expset[index].value);
    return base*Math.pow(10,exp);
}

function IFT(freqs, mags, phases, t0, dt, numsamples){
    var result = new Float32Array(numsamples);
    var gosimple = false;
    var sum;
    var i, t, s;
    if(phases == 0){
        nophase = true;
    }
    var numsigs = freqs.length;
    for(i = 0; i < numsamples; i++){
        t = i*dt+t0;
        sum = 0;
        for(s = 0; s < numsigs; s++){
            if(gosimple)
                sum += mags[s]*Math.cos(2*Math.PI*freqs[s]*t);
            else
                sum += mags[s]*Math.cos(2*Math.PI*freqs[s]*t+phases[s]);
        }
        result[i] = sum;
    }
    return result;
}

function DFT(ydata){
    //returns the DFT of the data provided, provided that it was properly spaced in time. magnitude only.
    //will also folder over the upper half, where position 0 is N, 1 to N-1, etc.
    var N = ydata.length;
    var result = new Float32Array(N);
    for(var k = 0; k < N; k++){
        var rsum = 0;
        var isum = 0;
        for(var n = 0; n < N; n++){
            rsum += ydata[n]*Math.cos(-n*k/N*Math.PI*2);
            isum += ydata[n]*Math.sin(-n*k/N*Math.PI*2);
        }
        if(rsum < Math.pow(10,-5)&& isum < Math.pow(10,-5)){
            result[k] = 0;
        }
        else
            result[k] = Math.sqrt(rsum*rsum+isum*isum)/N;
    }
    var lastindex;
    if(isEven(N))   lastindex = N/2-1;
    else            lastindex = Math.round(N/2);
    for(var n = 1; n < N/2; n++){
        if(N-n > n)
            result[n] += result[N-n]; 
    }
    return result.subarray(0,lastindex);
}

function plotSetup(ctx,xstart,xstop,ymin,ymax,plotxleft,plotytop,canvaswidth,canvasheight,plotxright,plotybottom){
    ctx.fillStyle="#AAAAAA";
    ctx.fillRect(0,0,canvaswidth,canvasheight);
    ctx.fillStyle="#33AA55";
    ctx.fillRect(plotxleft,plotytop,canvaswidth-plotxright-plotxleft,canvasheight-plotybottom-plotytop);
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    var x0pixel = plotxleft+(canvaswidth-plotxright-plotxleft)*(0-xstart)/(xstop-xstart);
    var y0pixel = canvasheight-plotybottom-(canvasheight-plotybottom-plotytop)*(0-ymin)/(ymax-ymin);
    if(x0pixel >= plotxleft && x0pixel <= canvaswidth-plotxright){
        ctx.moveTo(x0pixel,plotytop);
        ctx.lineTo(x0pixel,canvasheight-plotybottom);
    }
    if(y0pixel >= plotytop && y0pixel <= canvasheight-plotybottom){
        ctx.moveTo(plotxleft,y0pixel);
        ctx.lineTo(canvaswidth-plotxright,y0pixel);
    }
    ctx.stroke();
    ctx.closePath();
}

function plotData(ctx,xdata,ydata,xstart,xstop,ymin,ymax,plotxleft,plotytop,canvaswidth,canvasheight, plotxright, plotybottom){
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    for(var i = 0; i < xdata.length; i++){
        ctx.lineTo( plotxleft+(canvaswidth-plotxright-plotxleft)*(xdata[i]-xstart)/(xstop-xstart),
                    canvasheight-plotybottom-(canvasheight-plotybottom-plotytop)*(ydata[i]-ymin)/(ymax-ymin));
    }
    ctx.stroke();
    ctx.closePath();
}

var ydata, AMydata, RectData, xdata, dftofAMdata, dftofmsg, fsofAMDFT, fsofdftofmsg, DFTRect, FreqRect;

function UpdatePageView(){
    var canvas, ctx;
    var xstart = 0;
    var xstop  = 0.0002;
    var ymin   = -2;
    var ymax   =  2;
    var plotxleft = 50;
    var plotxright = 50;
    var plotytop  = 50;
    var plotybottom = 50;

    canvas = document.getElementById("canvastime");
    ctx = canvas.getContext("2d");
    plotSetup(ctx,xstart,xstop,ymin,ymax,plotxleft,plotytop,canvas.width,canvas.height,plotxright,plotybottom);
    if(document.getElementById("overlaymsg").checked)
        plotData(ctx,xdata,ydata,  xstart,xstop,ymin,ymax,plotxleft,plotytop,canvas.width,canvas.height, plotxright, plotybottom);
    if(document.getElementById("overlaymod").checked)
        plotData(ctx,xdata,AMydata,xstart,xstop,ymin,ymax,plotxleft,plotytop,canvas.width,canvas.height, plotxright, plotybottom);
    if(document.getElementById("overlayrct").checked)
        plotData(ctx,xdata,RectData,xstart,xstop,ymin,ymax,plotxleft,plotytop,canvas.width,canvas.height, plotxright, plotybottom);

    var fstart = 0;
    var fstop  = 1000000;
    var magstart = 0;
    var magstop  = 2;
    canvas = document.getElementById("canvasspectrum");
    ctx = canvas.getContext("2d");
    plotSetup(ctx,fstart,fstop,magstart,magstop,plotxleft,plotytop,canvas.width,canvas.height,plotxright,plotybottom);
    if(document.getElementById("modshowmsg").checked){
        plotData(ctx,fsofdftofmsg,dftofmsg,fstart,fstop,magstart,magstop,plotxleft,plotytop,canvas.width,canvas.height, plotxright, plotybottom);
    }
    if(document.getElementById("modshowam").checked){
        plotData(ctx,fsofAMDFT,dftofAMdata,fstart,fstop,magstart,magstop,plotxleft,plotytop,canvas.width,canvas.height, plotxright, plotybottom);
    }
    if(document.getElementById("modshowdemod").checked){
        plotData(ctx,FreqRect,DFTRect,fstart,fstop,magstart,magstop,plotxleft,plotytop,canvas.width,canvas.height, plotxright, plotybottom);
    }
}

function UpdatePage(){
    var fc = GrabNumberPair("fcarrier","fcarrierp");
    var Ac = GrabNumberPair("acarrier","acarrierp");
    var B  = GrabNumberPair("bias","biasp");
    var fs = GrabNumberPair("fsample","fsamplep");
    var numsamples = 500;
    var htmlfm = document.getElementsByClassName("cfreqmsg");
    var htmlfmp = document.getElementsByClassName("cfreqmsgp");
    var htmlam = document.getElementsByClassName("campmsg");
    var htmlamp = document.getElementsByClassName("campmsgp");
    var nummsgs = htmlam.length+1; //include bias signal
    var FM = new Array(nummsgs);
    var AM = new Array(nummsgs);
    var PM = new Array(nummsgs);

    //assign the freqs and amplitudes to the message vectors
    for(var i = 0; i < nummsgs; i++){
        if(i == nummsgs-1){
            FM[i] = 0;
            AM[i] = B;
            PM[i] = 0;
        }
        else{
            FM[i] = GrabIndexedPair(htmlfm,htmlfmp,i);
            AM[i] = GrabIndexedPair(htmlam,htmlamp,i);
            PM[i] = 0;
        }
    }
    var starttime = 0;
    var dt = 1/fs;

    xdata = new Float32Array(numsamples);

    //compute IFT of message to make time-msg
    ydata = IFT(FM,AM,PM,starttime,dt,numsamples);
    for(var i = 0; i < numsamples; i++){
        var t = i*dt+starttime;
        xdata[i] = t;
    }

    //compute DFT of message to verify that it worked
    dftofmsg = DFT(ydata);
    fsofdftofmsg = new Float32Array(dftofmsg.length);
    for(var i = 0; i < dftofmsg.length; i++){
        var f = i*fs/numsamples;
        fsofdftofmsg[i] = f;
    }
    console.log("DFT of message:",dftofmsg);

    //multiply message by carrier to generate AM system: Bias signal is the N-1 position in the message vector
    var sizeofAM = (nummsgs-1)*2+1;
    var AMfreqs = new Float32Array(sizeofAM);
    var AMamps  = new Float32Array(sizeofAM);
    var AMphis  = new Float32Array(sizeofAM);
    for(var i = 0; i < nummsgs; i++){
        AMphis[i] = PM[i];
        AMphis[i+nummsgs] = PM[i];
        var mag;
        if(i==nummsgs-1){
            AMamps[i]=B*Ac;
            AMfreqs[i] = fc;
            AMphis[i] = 0;
        }
        else{
            mag = 0.5*Ac*AM[i];
            AMamps[i] = mag;
            AMamps[i+nummsgs] = mag;
            AMfreqs[i] = fc-FM[i];
            AMfreqs[i+nummsgs] = fc+FM[i];
        }
    }
    console.log("AM signal mag, freq, phase:",AMamps,AMfreqs,AMphis);
    //IFT of the AM signal
    AMydata = IFT(AMfreqs,AMamps,AMphis,starttime,dt,numsamples);

    //compute DFT of AM signal to verify that it worked
    dftofAMdata = DFT(AMydata);
    fsofAMDFT = new Float32Array(dftofAMdata.length);
    for(var i = 0; i < dftofAMdata.length; i++){
        var f = i*fs/numsamples;
        fsofAMDFT[i] = f;
        if(dftofAMdata[i] > 0)
            console.log("DFT of AM signal:",f,dftofAMdata[i]);
    }

    //do a rectify pass on the AM IFT:
    RectData = new Float32Array(AMydata.length);
    for(var i = 0; i < AMydata.length; i++){
        if(AMydata[i] < 0)
            RectData[i] = 0;
        else    
            RectData[i] = AMydata[i];
    }
    
    //DFT the rectdata
    DFTRect = DFT(RectData);
    FreqRect = new Float32Array(DFTRect.length);
    for(var i = 0; i < DFTRect.length; i++){
        var f = i*fs/numsamples;
        FreqRect[i] = f;
        if(DFTRect[i] > 0)
            console.log("Rectified DFT:",f,DFTRect[i]);
    }
    UpdatePageView();
}
