var ndarray = require('ndarray');
var ops = require('ndarray-ops');
var isTypedArray = require('lodash/isTypedArray');
var reverse = require('lodash/reverse');
var sortBy = require('lodash/sortBy');
var take = require('lodash/take');

loadImageToCanvas = function(url, callback) {
    this.imageLoading = true;
    img = new Image();//document.createElement("img");    
    img.crop=true;
    img.cover=true;
    img.canvas=true;
    img.crossOrigin = "Anonymous";
    img.onload = function() {      
        if (img.type === 'error') {
            this.imageLoadingError = true;
            this.imageLoading = false;
        } else {
            console.log("IMAGE LOADED");
            // load image data onto input canvas
            const ctx = document.getElementById('input-canvas').getContext('2d');
            ctx.drawImage(img, 0, 0, 299, 299);
            this.imageLoadingError = false;
            this.imageLoading = false;
            this.modelRunning = true;
            // model predict
            callback();
        }
    };
    img.src = url;
};

loadDataToTensor = function(data, width, height) {
    // data processing
    let dataTensor = ndarray(new Float32Array(data), [width, height, 4]);
    let dataProcessedTensor = ndarray(new Float32Array(width * height * 3), [width, height, 3]);
    ops.divseq(dataTensor, 255);
    ops.subseq(dataTensor, 0.5);
    ops.mulseq(dataTensor, 2);
    ops.assign(dataProcessedTensor.pick(null, null, 0), dataTensor.pick(null, null, 0));
    ops.assign(dataProcessedTensor.pick(null, null, 1), dataTensor.pick(null, null, 1));
    ops.assign(dataProcessedTensor.pick(null, null, 2), dataTensor.pick(null, null, 2));
    const inputData = { input_1: dataProcessedTensor.data };
    return inputData;
}

/**
 * Find top k imagenet classes
 */
imagenetClassesTopK = function(classProbabilities, k = 5) {
    const probs = isTypedArray(classProbabilities) ? Array.prototype.slice.call(classProbabilities) : classProbabilities;

    const sorted = reverse(sortBy(probs.map((prob, index) => [ prob, index ]), probIndex => probIndex[0]));

    const topK = take(sorted, k).map(probIndex => {
        const iClass = imagenetClasses[probIndex[1]];
        return { id: iClass[0], name: iClass[1].replace(/_/, ' '), probability: probIndex[0] };
    });
    return topK;
}
