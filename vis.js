
var scene, camera, renderer, controls;

var pointSize = 4.0;

var theta = -Math.PI/2;
var distance;
var center = new THREE.Vector3(0,0,0);
var animateStart = 0;
var animationLength = 500;
var animationLayer = 0;
var currentModel;
var padding = 140;

var tooltip = document.getElementById('tooltip');
var toolline = document.getElementById('tool_line');

function adjustColor(value) {
    return (value/2+0.5);
}

function generateGeometryForImage(tensor, z) {
    var geometry = new THREE.Geometry();
    var shape = tensor.shape;
    var n = shape[0];
    var m = shape[1];
    var r,g,b = 0;
    colors = [];
    var color = new THREE.Color(1,1,1);
    var c = 0;
    let space = 2;
    for (let i=0; i<n; i++) {
        for (let j=0; j<m; j++) {
            for (let k=0; k<3; k++) {
                let v = adjustColor(tensor.get(i,j,k));
                geometry.vertices.push(
                    new THREE.Vector3((i-n)* space, (j-m/2) * space , k * space * 8)
                );
                let col = color.clone();
                col.r = k == 0 ? v : 0;
                col.g = k == 1 ? v : 0;
                col.b = k == 2 ? v : 0;
                colors[c] = col;            
                c++;                
            }
        }
    }
    geometry.colors = colors;
    geometry.computeBoundingBox();
    var size = 1.0;
    var material = new THREE.PointsMaterial( { size: size,
                                               vertexColors: THREE.VertexColors } );
    var pointcloud = new THREE.Points( geometry, material );    
    return pointcloud;
}

function updateGeometryForImage(geometry, tensor) {
    var shape = tensor.shape;
    var n = shape[0];
    var m = shape[1];
    var c = shape[2];
    let index = 0;
    for (let i=0; i<n; i++) {
        for (let j=0; j<m; j++) {            
            for (let k=0; k<c; k++) {
                let v = adjustColor(tensor.get(i,j,k));
                geometry.colors[index].r = k == 0 ? v : 0;
                geometry.colors[index].g = k == 1 ? v : 0;
                geometry.colors[index].b = k == 2 ? v : 0;
                index++;
            }
        }
    }
    geometry.colorsNeedUpdate = true;
}

var dense_map;
var top_dense;
function generateGeometryForDense(tensor, z0, depth, color) {
    var geometry = new THREE.BufferGeometry();
    dense_map = {};
    var shape = tensor.shape;
    var x,y,z = 0;
    var n = shape[0];
    var m = shape[1];
    var c = shape[2];
    var num_vertices = n*m*c;
    var alphas = new Float32Array( num_vertices * 1 );
    var sizes = new Float32Array( num_vertices * 1 );
    var vertices = new Float32Array( num_vertices * 3 );
    var colors = new Float32Array( num_vertices * 3 );
    var w = Math.ceil(Math.sqrt(num_vertices/depth));
    var space = 8;
    var size = 3.0;
    var top_N = [];
    var num_top = num_vertices/20;
    for (let i=0; i<num_vertices; i++) {
        x = (i % w - w/2) * space;
        y = (Math.floor(i / w) % w -w/2) * space;
        z = z0 + space * (depth - Math.floor(Math.floor(i/w)/w));
        vertices[i*3] = x;
        vertices[i*3+1] = y;
        vertices[i*3+2] = z;
        let intensity = tensor.get(0,0,i);
        alphas[i] = 0;//intensity*intensity;
        sizes[i] = Math.min( size * intensity, size*2);
        color = heatMap(intensity*4);
        colors[i*3] = color.r;
        colors[i*3+1] = color.g;
        colors[i*3+2] = color.b;

        let obj = {};
        obj['vertex'] = new THREE.Vector3(x, y, z);                
        obj['index'] = i;
        obj['value'] = intensity;
        if (top_N.length < num_top) {
            top_N.push(obj);
        } else if (intensity > top_N[0]['value']) {            
            top_N[0] = obj;
        }
        top_N.sort(function (a, b) {
            return a['value'] - b['value'];
        });               
    }
    top_dense = top_N;
    for (let i=0; i<num_top; i++) {
        let obj = top_N[i];
        dense_map[obj['index']] = obj;
    }
    geometry.addAttribute( 'alpha', new THREE.BufferAttribute( alphas, 1 ) );
    geometry.addAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
    geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    geometry.computeBoundingBox();
    var shaderMaterial = new THREE.ShaderMaterial( {
        uniforms:       { size: { value: size }},
        vertexShader:   document.getElementById( 'vertexshader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
        transparent:    true
    });
    var pointcloud = new THREE.Points( geometry, shaderMaterial );    
    return pointcloud;
}

function updateGeometryForDense(geometry, tensor, alpha) {
    var shape = tensor.shape;
    var n = shape[0];
    var m = shape[1];
    var c = shape[2];
    var num_vertices = n*m*c;
    var size = 3.0;
    for (let i=0; i<num_vertices; i++) {
        let intensity = tensor.get(0,0,i);
        geometry.attributes.alpha.array[i] = alpha * intensity*intensity;
        geometry.attributes.size.array[i] = intensity > 1.0 ? size : size * intensity;
        let color = heatMap(intensity*4);
        geometry.attributes.color.array[i*3] = color.r;
        geometry.attributes.color.array[i*3+1] = color.g;
        geometry.attributes.color.array[i*3+2] = color.b;
    }
    geometry.attributes.alpha.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
}

var predictions;
function generateGeometryForPredictions(tensor, z) {
    var geometry = new THREE.BufferGeometry();
    var N = tensor.shape[0];
    var w = Math.ceil(Math.sqrt(N));
    var num_vertices = w*w;
    var color = new THREE.Color(1,1,0);
    var alphas = new Float32Array(num_vertices * 1 );
    var vertices = new Float32Array(num_vertices * 3 );
    var colors = new Float32Array(num_vertices * 3 );
    var sizes = new Float32Array(num_vertices * 1);
    var max = getMax(tensor, N);
    predictions = [];
    var num_top = 5;
    for (let i=0; i<num_vertices; i++) {
        let x = (i % w - w/2) * 8;
        let y = (Math.floor(i / w)-w/2) * 8;
        vertices[i*3] = x;
        vertices[i*3+1] = y;
        vertices[i*3+2] = z;
        let value = tensor.get(i);
        let prediction_obj = {'index': i, 'value': value, 'vertex': new THREE.Vector3(x,y,z)};
        if (predictions.length < num_top) {
            predictions.push(prediction_obj);
        } else if (value > predictions[0]['value']) {
            predictions[0] = prediction_obj;
        }
        predictions.sort(function(a, b) {
            return a['value'] - b['value'];
        });
        var intensity = adjustPredictionIntensity(value, max, i, N);
        color = adjustPredictionColor(value, max, i, N);
        sizes[i] = i >= N ? 3.0 : Math.max(3.0, 10 * Math.sqrt(tensor.get(i)));
        alphas[i] = 0;// intensity;        
        colors[i*3] = color.r;
        colors[i*3+1] = color.g;
        colors[i*3+2] = color.b;
    }
    geometry.addAttribute( 'alpha', new THREE.BufferAttribute( alphas, 1 ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
    geometry.addAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
    geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    geometry.computeBoundingBox();
    var shaderMaterial = new THREE.ShaderMaterial( {
        vertexShader:   document.getElementById( 'vertexshader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
        transparent:    true
    });
    var pointcloud = new THREE.Points( geometry, shaderMaterial );
    prediction_cloud = pointcloud;
    return pointcloud;
}
let prediction_cloud;;

function updateGeometryForPredictions(geometry, tensor, alpha) {
    var N = tensor.shape[0];
    var w = Math.ceil(Math.sqrt(N));
    var num_vertices = w*w;
    var max = getMax(tensor, N);
    for (let i=0; i<num_vertices; i++) {
        var intensity = adjustPredictionIntensity(tensor.get(i), max, i, N);
        geometry.attributes.alpha.array[i] = intensity * alpha;
        geometry.attributes.size.array[i] = i >= N ? 3.0 : Math.max(3.0, 10 * Math.sqrt(tensor.get(i)));
        let color = adjustPredictionColor(tensor.get(i), max, i, N);
        geometry.attributes.color.array[i*3] = color.r;
        geometry.attributes.color.array[i*3+1] = color.g;
        geometry.attributes.color.array[i*3+2] = color.b;        
    }
    geometry.attributes.alpha.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
}

function getMax(tensor, N) {
    var max = 0;
    for (let i=0; i<N; i++) {
        if (tensor.get(i) > max) {
            max = tensor.get(i);
        }
    }
    return max;
}

function adjustPredictionIntensity(value, max, i, N) {
    if (i < N) {
        return 0.5 + 0.5*value/max;
    } else {
        return 0.5;
    }
}

function adjustPredictionColor(value, max, i, N) {
    let b = 1;
    if (i < N) {
        b =  1 - Math.sqrt(Math.sqrt(value))/max;
    }
    return new THREE.Color(1,1,b);
}

function adjustSize(value) {
    let cap = 8;
    if (value > cap) {
        return Math.min(pointSize*2, pointSize * value / cap);
    } else {
        return pointSize;
    }
}

function adjustIntensity(value) {
    let cap = 4;
    let factor = 4;
    let intensity = 0;
    if (value >= cap) {
        intensity = 1;
    } else if (value > 0. && value < cap) {
        intensity = Math.pow(value,factor)/Math.pow(cap,factor+1);
    }
    return intensity;
}

function heatMap(value) {
    value = value / 4;
    if (value > 2) {
        value = 2;
    }
    if (value < 1) {
        value = 0;
    } else {
        value = value - 1;
    }
    if (value < 0.5) {
        return new THREE.Color(1-value, 1, 1);
    } else if (value < 0.75) {
        return new THREE.Color(.5+(value-.5)*2, 1, 1-value);
    } else {
        return new THREE.Color(1, 1-((value-.75)*2), 1-value);
    }
}
var top_vertices = [];
function generateGeometryForTensor(tensor, z0, blocks, color_start, space) {
    var geometry = new THREE.BufferGeometry();
    var numPoints = 1;
    var shape = tensor.shape;
    var x,y,z = 0;
    var n = shape[0];
    var m = shape[1];
    var c = shape[2];
    var numVertices = n*m*c;
    var newC = c / (blocks[0] * blocks[1]);
    var x_offset = n * space/2;
    var y_offset = m * space/2;    
    if (c > newC) {
        x_offset = n * blocks[1] * space/2;
        y_offset = m * blocks[1] * space/2;
    }
    var alphas = new Float32Array( numVertices * 1 );
    var sizes = new Float32Array( numVertices * 1 );
    var vertices = new Float32Array( numVertices * 3 );
    var colors = new Float32Array( numVertices * 3 );
    var color = color_start.clone();
    //nextColor(color, colorDelta);    
    var total_count = 0;
    var num_top = numVertices / 40;
    if (c > 1000) {
        num_top = numVertices / 160;
    }
    num_top = Math.min(50, num_top);
    var top_N = [];    
    for (let k=c-1; k>0; k--) {
        //nextColor(color, -colorDelta/k);
        for (let i=0; i<n; i++) {
            x = i * space;
            for (let j=0; j<m; j++) {
                y = (m-j) * space;
                z = z0 + (k+Math.random()-0.5) * space;
                let value = tensor.get(i,j,k);
                let intensity = adjustIntensity(value);
                color = heatMap(value);
                let block = Math.floor(k / newC);
                let newX = x;
                let newY = y;
                let newZ = z;
                if (c > newC) {
                    let blockX = Math.floor(block / blocks[1]);  
                    let blockY = block % blocks[1];
                    newX = x * blocks[1] + blockX * space* blocks[1] / blocks[0];
                    newY = y * blocks[1] + blockY * space;
                    newZ = z0 + (k % newC+Math.random()-0.5) * space;
                }
                newX = newX - x_offset;
                newY = newY - y_offset;

                let thresh = 0;
                colors[total_count*3] = intensity < thresh ? .5 : color.r;
                colors[total_count*3+1] = intensity < thresh ? .5 : color.g;
                colors[total_count*3+2] = intensity < thresh ? .5 : color.b;
                sizes[total_count] = adjustSize(value);
                alphas[total_count] = 0; // intensity < thresh ? thresh : intensity;
                vertices[total_count*3] = newX;
                vertices[total_count*3+1] = newY;
                vertices[total_count*3+2] = newZ;
                let is_edge = (i==0 || j==0 || i==n-1 || j==m-1) && n>32;
                if (!is_edge && (top_N.length < num_top || top_N[0]['value'] < value)) {
                    let obj = {};
                    obj['vertex'] = new THREE.Vector3(newX, newY, newZ);                
                    obj['index'] = total_count;
                    obj['coords'] = new THREE.Vector3(i, j, k);
                    obj['value'] = value;
                    obj['shape'] = shape;
                    if (top_N.length < num_top) {
                        top_N.push(obj);
                    } else {
                        top_N[0] = obj;
                    }
                    top_N.sort(function (a, b) {
                        return a['value'] - b['value'];
                    });
                }
                total_count++;
            }
        }
    
    }
    let top_color = new THREE.Color(1,0,0);
    for (let i = 0; i < top_N.length; i++) {
        let index = top_N[i]['index'];
        colors[index*3] = top_color.r;
        colors[index*3+1] = top_color.g;
        colors[index*3+2] = top_color.b;
    }
    geometry.addAttribute( 'alpha', new THREE.BufferAttribute( alphas, 1 ) );
    geometry.addAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
    geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    geometry.computeBoundingBox();    
    // point cloud material
    var shaderMaterial = new THREE.ShaderMaterial( {
        uniforms:       { size: { value: pointSize } },
        vertexShader:   document.getElementById( 'vertexshader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
        transparent:    true
    });
    var pointcloud = new THREE.Points( geometry, shaderMaterial );
    top_vertices.push(top_N);
    return pointcloud;
}

function updateGeometryForTensor(geometry, tensor, alpha) {
    var shape = tensor.shape;
    var n = shape[0];
    var m = shape[1];
    var c = shape[2];
    var index = 0;
    for (let k=c-1; k>0; k--) {            
        for (let i=0; i<n; i++) {
            for (let j=0; j<m; j++) {
                let value = tensor.get(i,j,k);
                let intensity = adjustIntensity(value);
                if (alpha >= 0) {
                    intensity = alpha * intensity;
                }
                let color = heatMap(value);
                geometry.attributes.color.array[index*3] = color.r;
                geometry.attributes.color.array[index*3+1] = color.g;
                geometry.attributes.color.array[index*3+2] = color.b;
                geometry.attributes.alpha.array[index] = intensity;
                geometry.attributes.size.array[index] = adjustSize(value);
                index++;
            }
        }
    }
    geometry.attributes.alpha.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
}

function getNewZ(z, newZ) {
    let reduced = z / newZ;
    var factor = Math.floor(reduced);
    while (z % factor != 0 && factor > 0) {
        factor--;
    }
    var root = Math.floor(Math.sqrt(factor));
    while (factor % root != 0 && root > 0) {
        root--;
    }
    return [root, factor/root];
}

function nextColor(color, delta) {
    if (color.g < 1 && color.r > 0) {
        color.g = color.g + delta;
        color.r = color.r - delta;
    }
}

function drawLines() {
    let geometry = new THREE.Geometry();
    let num_layers = top_vertices.length;
    for (let i=num_layers-1; i>0; i--) {
        let layer = top_vertices[i];
        let next_layer = top_vertices[i-1];
        let x_thresh = windows[i];
        let y_thresh = windows[i];        
        for (let j in layer) {
            let obj = layer[j];
            let coords = obj['coords'];
            let size_a = obj['shape'];
            // very inefficient way to do this
            for (let k in next_layer) {
                let target = next_layer[k];
                let t_coords = target['coords'];
                let size_b = target['shape'];
                let scale = size_b[0] / size_a[0];
                if (Math.abs(coords.x*scale - t_coords.x) < x_thresh*scale &&
                    Math.abs(coords.y*scale - t_coords.y) < y_thresh*scale) {
                    geometry.vertices.push(obj['vertex']);
                    geometry.vertices.push(target['vertex']);
                }
            }
        }
    }
    let material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 1        
    });
    material.opacity = 0.1;
    material.transparent = true;
    let lines = new THREE.LineSegments(geometry, material);
    return lines;
}
function drawDenseLines() {
    let geometry = new THREE.Geometry();
    let layer = top_vertices[top_vertices.length-1];
    for (let i = Math.floor(layer.length*3/4); i < layer.length; i++) {
        let obj = layer[i];
        for (let j = Math.floor(top_dense.length*3 / 4); j < top_dense.length; j++) {
            let target = top_dense[j];
            geometry.vertices.push(obj['vertex']);
            geometry.vertices.push(target['vertex']);            
        }
    }
    let material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 1        
    });
    material.opacity = 0.1;
    material.transparent = true;
    let lines = new THREE.LineSegments(geometry, material);
    return lines;
}

function drawPredictionLines(weights) {
    let lines = [];
    for (let k=0; k < predictions.length; k++) {
        let prediction_obj = predictions[k];
        let prediction_index = prediction_obj['index'];
        let geometry = new THREE.Geometry();
        let dense_weights =  weights.pick(null, prediction_index);
        let max_weights = [];
        let num_max = dense_weights.size/20;
        for (let i = 0; i < dense_weights.size; i++) {
            let value = dense_weights.get(i);
            if (max_weights.length < num_max) {
                max_weights.push({'value': value, 'index': i});            
            } else if (value > max_weights[0]['value']){
                max_weights[0] = {'value': value, 'index': i};
            }
            max_weights.sort(function(a, b) {
                return a['value']-b['value'];
            });
            
        }
        for (let i = 0; i < num_max; i++) {
            let obj = max_weights[i];
            let index = obj['index'];
            if (dense_map.hasOwnProperty(index)) {
                let dense_obj = dense_map[index];
                geometry.vertices.push(prediction_obj['vertex']);
                geometry.vertices.push(dense_obj['vertex']);
            }
        }
        let material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 1        
        });
        material.opacity = prediction_obj['value']*2/3;
        material.transparent = true;
        lines.push(new THREE.LineSegments(geometry, material));
    }
    return lines;
}

//var layers = ["maxpooling2d_1", "averagepooling2d_1",
var layers = [ "averagepooling2d_1",              
              //              "averagepooling2d_2", "averagepooling2d_3", "mixed2",
              "mixed0", "mixed1", "mixed2",
//              "averagepooling2d_4", "averagepooling2d_5", "averagepooling2d_6",
              "mixed3", "mixed4", "mixed5",
//              "averagepooling2d_7", "averagepooling2d_8", "averagepooling2d_9",
              "mixed6", "averagepooling2d_8", "mixed8",
              "averagepooling2d_10", "avg_pool", "predictions"];
var windows = [2,2,2,3,2,3,3,3,3,3,3,2];

var colorDelta = 1.0 / (layers.length-1);
var vis_initialized = false;
function initVis(model) {
    currentModel = model;
    console.log("INITIALIZING VISUALIZATION");
    vis_initialized = true;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, (window.innerWidth-padding) / (window.innerHeight/2), 1, 5000 );
    camera.rotation.z = Math.PI/2;

//    key_iter = model.modelLayersMap.keys();
    let color = new THREE.Color(1, 0, 1);
    let z = 0;
    for (let i=0; i < layers.length; i++) {
        let key = layers[i];
//    for (let key of key_iter) {
        let layer = model.modelLayersMap.get(key);
        let tensor = layer.result.tensor;
        let shape = tensor.shape;
        console.log(key + " " + shape);
        if (key.includes("input")) {
            let points = generateGeometryForImage(tensor, 1);
            points.name =key;
            scene.add(points);
            z = 128;
        } else if (shape && (key.includes("mixed") || key.includes("pooling") )){
            //nextColor(color, colorDelta);
            let c = shape[2];
            var blocks = [1, 1];
            var newZ = 32;
            if (c == 736) {
                newZ = 46;
            }
            if (c == 64) {
                newZ = 64;
            }
            
            console.log(newZ);
            if (c > newZ) {
                blocks = getNewZ(c, newZ);
            }
            console.log(blocks);
            var space = key.includes("max") ? 5 : 3;
            let points = generateGeometryForTensor(tensor, z, blocks, color, space);
            if (shape.length > 2) {
                var newC = c / (blocks[0] * blocks[1]);
                z = z + newC * space + 32;
            }
            points.name = key;
            scene.add(points);
        } else if (key.includes("avg_pool")) {
            let depth = 8;
            color = new THREE.Color(.5,1,.5);
            let points = generateGeometryForDense(tensor, z, depth, color);
            points.name = key;
            scene.add(points);
            z = z + depth * space + 128;
        } else if (key.includes("prediction")) {
            let points = generateGeometryForPredictions(tensor, z);
            points.name = key;
            scene.add(points);            
        }
    }
    for (let i=0; i < scene.children.length; i++) {
        scene.children[i].renderOrder = scene.children.length - i;
    }
    let prediction_lines = drawPredictionLines(model.modelLayersMap.get('predictions').weights.W.tensor);
    for (let i=0; i < prediction_lines.length; i++) {
//        scene.add(prediction_lines[i]);
    }
//    scene.add(drawDenseLines());
//    scene.add(drawLines());
    // Set up the center to rotate camera around
    center.z = z/2;//  + 100;
    distance = center.z + 350;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth-padding, window.innerHeight/2);
    document.getElementById('vis').appendChild(renderer.domElement );
    
    renderer.domElement.onmousedown = mouseDown;
    renderer.domElement.onmouseup = mouseUp;
    renderer.domElement.onmouseleave = mouseLeave;
    renderer.domElement.onmousemove = mouseMove;
}

var isMouseDown = false;
var isAnimating = false;
var lastX = -1;
function mouseDown(e) {
    isMouseDown = true;
    lastX = e.clientX;
}

function mouseUp() {
    isMouseDown = false;
}

function mouseLeave() {
    isMouseDown = false;
}
window.addEventListener('scroll', function(e) {
    domRect = document.getElementById('vis').getBoundingClientRect();    
});

function clearTooltip() {
    if (tooltip && tooltip.innerHTML !== "") {
        tooltip.innerHTML = "";
        toolline.setAttribute("x1", "0");
        toolline.setAttribute("y1", "0");
        toolline.setAttribute("x2", "0");
        toolline.setAttribute("y2", "0");
    }            
}

var raycaster = new THREE.Raycaster();
raycaster.params = {Points: {threshold:4}};
var mouse = new THREE.Vector2();
var projected = new THREE.Vector3();
var domRect;
var hoverIndex = -1;
var lastActiveMouse = new THREE.Vector2();
function mouseMove(e) {
    if (domRect.top === 0) {
        domRect = document.getElementById('vis').getBoundingClientRect();
    }
    if (tooltip === null) {
        tooltip = document.getElementById('tooltip');
    }
    if (toolline === null) {
        toolline = document.getElementById('tool_line');
    }
    if (!isAnimating) {
        if (isMouseDown) {
            const x = e.clientX;
            const delta = x - lastX;
            lastX = x;
            theta += delta*.01;
            refresh();
            clearTooltip();
        } else {
            if ((theta % (Math.PI*2) / Math.PI > .35 && theta % (Math.PI*2) / Math.PI < .65) ||
                (theta % (Math.PI*2) / Math.PI < -1.35 && theta % (Math.PI*2) / Math.PI > -1.65)) {
            // calculate mouse position in normalized device coordinates
            // (-1 to +1) for both components
            const domE = renderer.domElement;
            mouse.x = ( (e.clientX - domRect.left) / domE.offsetWidth ) * 2 - 1;
            mouse.y = - ( (e.clientY - domRect.top) / domE.offsetHeight ) * 2 + 1;
            // update the picking ray with the camera and mouse position
            raycaster.setFromCamera( mouse, camera );

            // calculate objects intersecting the picking ray
            var intersects = raycaster.intersectObjects( [prediction_cloud] );
            if (intersects.length <= 0) {
                let distance = mouse.distanceTo(lastActiveMouse);
                if (distance > .05) {
                    clearTooltip();
                }
            } else {         
                const obj = intersects[0];
                if (obj.object.name === "predictions") {
                    const index = obj.index;
                    if (index !== hoverIndex) {
                        lastActiveMouse.set(mouse.x, mouse.y);
                        let str = imagenetClasses[index][1].split('_').join(' ').toUpperCase();
                        const prob = Math.round(model.modelLayersMap.get("predictions").result.tensor.get(index) * 10000) / 100;
                        
                        const p_x = obj.object.geometry.attributes.position.array[index*3];
                        const p_y = obj.object.geometry.attributes.position.array[index*3+1];
                        const p_z = obj.object.geometry.attributes.position.array[index*3+2];
                        str += " " + prob + "%";
                        tooltip.innerHTML = str;

                        hoverIndex = index;
                        projected.set(p_x, p_y, p_z);
                        //projected.set(obj.point.x, obj.point.y, obj.point.z);
                        projected.project(camera);

                        projected.x = Math.round( (   projected.x + 1 ) * domRect.width  / 2 );
                        let toolY = Math.round((- projected.y*2/3 + 1) * domRect.height / 2);
                        let toollineY = toolY;
                        projected.y = Math.round( ( - projected.y + 1 ) * domRect.height / 2 );
                        if (projected.y > domRect.height / 2) {
                            toollineY += 20;
                        }
                        let toolX = 0;
                        let toollineX = 0;
                        if (index < 512) {//projected.x < domRect.width / 2) {
                            toolX = projected.x/3;
                            toollineX = toolX + 50;
                        } else {
                            toolX = Math.floor(domRect.width*3/4) + (projected.x-domRect.width/2)/4;
                            toollineX = toolX;
                        }
                        
                        tooltip.style.left = toolX+"px";// (e.clientX - domRect.left) + "px";
                        tooltip.style.top = toolY+"px";//(e.clientY - domRect.top - 50) + "px";
                        
                        toolline.setAttribute("x1", projected.x+"");
                        toolline.setAttribute("y1", projected.y+"");
                        toolline.setAttribute("x2", toollineX+"");
                        toolline.setAttribute("y2", toollineY+"");
                    }
                }
            } 
            }
        }
    }
}

function getAnimationLayer(now) {
    const elapsed = now - animateStart;
    if (elapsed > (1 + layers.length) * animationLength) {
        return -1;
    } else {
        return Math.floor(elapsed / animationLength)-1;
    }
}
function updateVis(model) {
    currentModel = model;
//    console.log("UPDATING VISUALIZATION");
    var children = scene.children;
    for (let i=0; i<children.length; i++) {
        const now = new Date().getTime();
        animationLayer = getAnimationLayer(now);
        if (animationLayer < 0 || animationLayer == i) {
            let child = children[i];
            let key = child.name;
            let layer = model.modelLayersMap.get(key);
            let tensor = layer.result.tensor;
            let geometry = child.geometry;
            const delta = now - animateStart;
            let alpha = 0;
            if (animationLayer >= 0 && delta < animationLength * (layers.length+1)) {
                alpha = (delta % animationLength) / animationLength;
            }
            
            if (key.includes("input")) {
                updateGeometryForImage(geometry, tensor);
            } else if (key.includes("pooling") || key.includes("mixed")) {           
                updateGeometryForTensor(geometry, tensor, alpha);
            } else if (key.includes("avg_pool")) {
                updateGeometryForDense(geometry, tensor, alpha);
            } else if (key.includes("prediction")) {
                updateGeometryForPredictions(geometry, tensor, alpha);
            }
        }
    }
}

function refresh() {
    camera.position.y = distance * Math.cos(theta) + center.y;
    camera.position.z = distance * Math.sin(theta) + center.z;
    camera.lookAt(center);
    camera.rotation.z = Math.PI/2;
    renderer.render(scene, camera);
}

function render() {
    renderer.render(scene, camera);
}

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        function( callback ){
            window.setTimeout(callback, 1000 / 60);
        };
})();


function startAnimate() {
    document.getElementById('vis').style.display = 'block';    
    isAnimating = true;
    theta = -Math.PI/2;
    animateStart = new Date().getTime();
    animate();
}

var requestId;
function animate(){
    theta += -.01;
    if ((new Date().getTime()-animateStart) < animationLength*(1+layers.length)) {
        updateVis(currentModel);
        requestId = requestAnimFrame(animate);
    } else {
        isAnimating = false;
        showTextOverlay();
    }
    refresh();
}

function stopAnimate() {
    isAnimating = false;
    window.cancelAnimationFrame(requestId);
    requestId = undefined;
    showTextOverlay();
}
