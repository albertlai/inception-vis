
var scene, camera, renderer;

var pointSize = 2.0;

var theta = -Math.PI;
var distance;
var center = new THREE.Vector3(0,0,0);

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

function generateGeometryForDense(tensor, z0, depth, color) {
    var geometry = new THREE.BufferGeometry();
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
    var max = 0;
    for (let i=0; i<num_vertices; i++) {
        x = (i % w - w/2) * space;
        y = (Math.floor(i / w) % w -w/2) * space;
        z = z0 + space * (depth - Math.floor(Math.floor(i/w)/w));
        vertices[i*3] = x;
        vertices[i*3+1] = y;
        vertices[i*3+2] = z;
        let intensity = tensor.get(0,0,i);
        if (intensity > max) {
            max = intensity;
        }
        alphas[i] = intensity*intensity;
        sizes[i] = intensity > 1.0 ? size : size * intensity;
        colors[i*3] = color.r;
        colors[i*3+1] = color.g;
        colors[i*3+2] = color.b;
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

function updateGeometryForDense(geometry, tensor) {
    var shape = tensor.shape;
    var n = shape[0];
    var m = shape[1];
    var c = shape[2];
    var num_vertices = n*m*c;
    var size = 3.0;
    for (let i=0; i<num_vertices; i++) {
        let intensity = tensor.get(0,0,i);
        geometry.attributes.alpha.array[i] = intensity*intensity;
        geometry.attributes.size.array[i] = intensity > 1.0 ? size : size * intensity;
    }
    geometry.attributes.alpha.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
}

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
    for (let i=0; i<num_vertices; i++) {
        let x = (i % w - w/2) * 8;
        let y = (Math.floor(i / w)-w/2) * 8;
        vertices[i*3] = x;
        vertices[i*3+1] = y;
        vertices[i*3+2] = z;
        var intensity = adjustPredictionIntensity(tensor.get(i), max, i, N);
        sizes[i] = i >= N ? 4.0 : Math.max(4.0, 10 * tensor.get(i));
        alphas[i] = intensity;        
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
    return pointcloud;
}

function updateGeometryForPredictions(geometry, tensor) {
    var N = tensor.shape[0];
    var w = Math.ceil(Math.sqrt(N));
    var num_vertices = w*w;
    var max = getMax(tensor, N);
    for (let i=0; i<num_vertices; i++) {
        var intensity = adjustPredictionIntensity(tensor.get(i), max, i, N);
        geometry.attributes.alpha.array[i] = intensity;
        geometry.attributes.size.array[i] = i >= N ? 4.0 : Math.max(4.0, 10 * tensor.get(i));
    }
    geometry.attributes.alpha.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
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
        return 0.25 + 0.75*value/max;
    } else {
        return 0.25;
    }
}
function adjustSize(value) {
    let cap = 3;
    if (value > cap) {
        return pointSize * value / cap;
    } else {
        return pointSize;
    }
}
function adjustIntensity(value) {
    let cap = 3;
    let factor = 3;
    if (value >= cap) {
        return 1;
    } else if (value > 0. && value < cap) {
        return Math.pow(value,factor)/Math.pow(cap,factor+1);
    } else {
        return 0;
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
    nextColor(color, colorDelta);    
    var total_count = 0;
    var num_top = Math.min(50, numVertices / 10);
    var top_N = [];    
    for (let k=c-1; k>0; k--) {
        nextColor(color, -colorDelta/k);
        for (let i=0; i<n; i++) {
            x = i * space;
            for (let j=0; j<m; j++) {
                y = (m-j) * space;
                z = z0 + (k+Math.random()-0.5) * space;
                let value = tensor.get(i,j,k);
                let intensity = adjustIntensity(value);
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
                alphas[total_count] = intensity < thresh ? thresh : intensity;
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
    let top_color = new THREE.Color(1,1,1);
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

function updateGeometryForTensor(geometry, tensor) {
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
                geometry.attributes.alpha.array[index] = intensity;
                geometry.attributes.size.array[index] = adjustSize(value);
                index++;
            }
        }
    }
    geometry.attributes.alpha.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
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

var layers = ["maxpooling2d_1", "averagepooling2d_1",
              "averagepooling2d_2", "averagepooling2d_3", "mixed2",
              "averagepooling2d_4", "averagepooling2d_5", "averagepooling2d_6",
              "averagepooling2d_7", "averagepooling2d_8", "averagepooling2d_9",
              "averagepooling2d_10", "avg_pool", "predictions"];
var windows = [2,2,2,3,2,3,3,3,3,3,3,2];

var colorDelta = 1.0 / (layers.length-1);
var vis_initiaized = false;
function initVis(model) {
    console.log("INITIALIZING VISUALIZATION");
    vis_initiaized = true;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000 );
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
        } else if (shape && (key.includes("mixed") || (key.includes("pooling") && key != "averagepooling2d_1") )){
            nextColor(color, colorDelta);
            let c = shape[2];
            var blocks = [1, 1];
            let newZ = c < 256*3 ? 64 : 32;
            if (c > newZ) {
                blocks = getNewZ(c, newZ);
            }
            console.log(blocks);
            var space = key.includes("max") ? 5 : 3;
            let points = generateGeometryForTensor(tensor, z, blocks, color, space);
            if (shape.length > 2) {
                var newC = c / (blocks[0] * blocks[1]);
                z = z + newC * space + 64;
            }
            points.name = key;
            scene.add(points);
        } else if (key.includes("avg_pool")) {
            let depth = 8;
            color = new THREE.Color(.5,1,.5);
            let points = generateGeometryForDense(tensor, z, depth, color);
            points.name = key;
            scene.add(points);
            z = z + depth * space + 64;
        } else if (key.includes("prediction")) {
            let points = generateGeometryForPredictions(tensor, z);
            points.name = key;
            scene.add(points);
        }
    }
    for (let i=0; i < scene.children.length; i++) {
        scene.children[i].renderOrder = scene.children.length - i;
    }

    scene.add(drawLines());
    // Set up the center to rotate camera around
    center.z = z/2;//  + 100;
    distance = center.z + 750;
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    
    document.body.appendChild( renderer.domElement );
}

function updateVis(model) {
    console.log("UPDATING VISUALIZATION");
    var children = scene.children;
    for (let i=0; i<children.length; i++) {
        let child = children[i];
        let key = child.name;
        let layer = model.modelLayersMap.get(key);
        let tensor = layer.result.tensor;
        let geometry = child.geometry;
        if (key.includes("input")) {
            updateGeometryForImage(geometry, tensor);
        } else if (key.includes("pooling") && key != "averagepooling2d_1") {           
            updateGeometryForTensor(geometry, tensor);
        } else if (key.includes("avg_pool")) {
            updateGeometryForDense(geometry, tensor);
        } else if (key.includes("prediction")) {
            updateGeometryForPredictions(geometry, tensor);
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
