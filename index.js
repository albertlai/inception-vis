var left = 37;
var up = 38;
var right = 39;
var down = 40;

//data_url = "http://i.imgur.com/CzXTtJV.jpg";
//data_url = "http://i.imgur.com/OB0y6MR.jpg";
data_url = "https://farm4.staticflickr.com/3075/3168662394_7d7103de7d_z_d.jpg";
// in browser, URLs can be relative or absolute
base_url = "Inception/";
model_url = base_url + "inception_v3.json";
weights_url = base_url + "inception_v3_weights.buf";
meta_url = base_url + "inception_v3_metadata.json";
this.model = new KerasJS.Model({
    filepaths: {
        model: model_url,
        weights: weights_url,
        metadata: meta_url
    },
    gpu: this.hasWebgl
});
    
this.model.ready()
    .then(() => {
        console.log("INCEPTION V3 READY");
        loadImageToCanvas(data_url, predict);
    });

function predict() {
       const ctx = document.getElementById('input-canvas').getContext('2d');
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        const { data, width, height } = imageData;
        
        var inputData = loadDataToTensor(data, width, height);
        this.model.predict(inputData).then(outputData => {
            this.output = outputData['predictions'];
            this.modelRunning = false;
            console.log("done");
            
            let topK = imagenetClassesTopK(this.output);
            let str = "";
            for (i=0; i<topK.length; i++) {
                let pred = topK[i];
                str = str + pred["name"] + "\t" + pred["probability"];
                str = str + " </br>";
            }
            document.getElementById("predictions").innerHTML = str;
            
            initVis(this.model);
            refresh();
            key_iter = model.modelLayersMap.keys();
            counts = 0;
            for (let key of key_iter) {
                let tensor = this.model.modelLayersMap.get(key).result.tensor;
                c = tensor.data.length;
                counts += c;
            }
            console.log(counts);
        })
            .catch(err => {
                console.log(err);
            });
}

// from image_urls.js
select.onchange = function() {
    let selected = select.options[select.selectedIndex];
    console.log(selected.text);
    loadImageToCanvas(selected.value, function() { console.log("hi"); });
};

document.onkeydown = checkKey;

function checkKey(e) {
    switch (e.keyCode) {
    case right:
        theta += -Math.PI/50;
        refresh();
        e.preventDefault();
        break;
    case left:
        theta += Math.PI/50;
        refresh();
        e.preventDefault();        
        break;
    case up:
        distance += -50;
        refresh();
        e.preventDefault();                
        break;
    case down:
        distance += 50;
        refresh();
        e.preventDefault();        
        break;        
    }
}
