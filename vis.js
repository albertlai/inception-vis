
var scene, camera, renderer;

var pointSize = 2;

var theta = -Math.PI*9/16;
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
    for (i=0; i<n; i++) {
        for (j=0; j<m; j++) {
            r = adjustColor(tensor.get(i,j,0));
            g = adjustColor(tensor.get(i,j,1));
            b = adjustColor(tensor.get(i,j,2));
            geometry.vertices.push(
                new THREE.Vector3(i, j, z)
            );
            let col = color.clone();
            col.r = r;
            col.g = g;
            col.b = b;
            colors[c] = col;            
            c++;
        }
    }
    geometry.colors = colors;
    geometry.computeBoundingBox();
    var material = new THREE.PointsMaterial( { size: pointSize,
                                               vertexColors: THREE.VertexColors } );
    var pointcloud = new THREE.Points( geometry, material );    
    return pointcloud;
}

function generateGeometryForPredictions(tensor, z) {
    var geometry = new THREE.Geometry();
    var N = tensor.shape[0];
    var w = Math.ceil(Math.sqrt(N));
    var color = new THREE.Color(1,1,0);
    var colors = [];
    var max = 0;
    for (i=0; i<N; i++) {
        if (tensor.get(i) > max) {
            max = tensor.get(i);
        }
    }
    console.log(max);
    for (i=0; i<N; i++) {
        let x = (i % w - w/2) * 8;
        let y = (Math.floor(i / w)-w/2) * 8;

        geometry.vertices.push(
            new THREE.Vector3(x, y, z)
        );
        let intensity = 0.1 + 0.9*tensor.get(i)/max;        
        let col = new THREE.Color(intensity, intensity, 0);
        colors[i] = col;

    }
    geometry.colors = colors;
    geometry.computeBoundingBox();
    var material = new THREE.PointsMaterial( { size: 8,
                                               vertexColors: THREE.VertexColors } );
    var pointcloud = new THREE.Points( geometry, material );    
    return pointcloud;

}
var space = 3;
function generateGeometryForTensor(tensor, z0, blocks, color_start) {
    var geometry = new THREE.Geometry();
    var numPoints = 1;
    var shape = tensor.shape;
    var x,y,z = 0;
    var n = shape[0];
    var m = shape[1];
    var c = shape[2];
    var newC = c / (blocks[0] * blocks[1]);
    var x_offset = n * space/2;
    var y_offset = m * space/2;    
    if (c > newC) {
        x_offset = n * blocks[1] * space/2;
        y_offset = m * blocks[1] * space/2;
    }
    console.log(shape);
    console.log(blocks);
    console.log(x_offset);
    console.log(y_offset);
    colors = [];
    color = color_start;
    var total_count = 0;
    var nulls = 0;
    var over_ones = 0;
    var regs = 0;
    var average = 0;
    for (i=0; i<n; i++) {
        x = i * space;
        for (j=0; j<m; j++) {
            y = j * space;
            if (shape.length > 2) {
                for (k=0; k<c; k++) {
                    z = z0 + k * space;
                    var intensity = 0;
                    let value = tensor.get(i,j,k);
                    if (value >= 2) {
                        intensity = 1;
                        over_ones++;
                    } else if (value > 0.1 && value < 2) {
                        intensity = value*value*value/8;
                        if (intensity < 0.1) {
                            intensity = 0;
                        }
                        regs++;
                        average = value + average;
                    } else {
                        nulls++;
                        intensity = 0;
                    }
                    if (intensity > 0) {
                        let block = Math.floor(k / newC);
                        let newX = x;
                        let newY = y;
                        let newZ = z;
                        if (c > newC) {
                            let blockX = Math.floor(block / blocks[1]);  
                            let blockY = block % blocks[1];
                            newX = x * blocks[1] + blockX * space* blocks[1] / blocks[0];
                            newY = y * blocks[1] + blockY * space;
                            newZ = z0 + (k % newC) * space;
                        }
                        newX = newX - x_offset;
                        newY = newY - y_offset;
                        geometry.vertices.push(
                            new THREE.Vector3(newX, newY, newZ)
                        );
                        
                        colors[total_count] = color.clone().multiplyScalar(intensity);
                        total_count++;
                    }
                }
            } else {
                geometry.vertices.push(
                    new THREE.Vector3(x, y, z)
                );            
            }
        }
    }
//    console.log(n);
//    console.log(nulls);
//    console.log(regs);
//    console.log(over_ones);
//    console.log(average / regs);
    geometry.colors = colors;
    geometry.computeBoundingBox();
    var material = new THREE.PointsMaterial( { size: pointSize,
                                               vertexColors: THREE.VertexColors } );
    var pointcloud = new THREE.Points( geometry, material );    
    return pointcloud;
}

function getNewZ(z) {
    reduced = z / 64;
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

function initVis(model) {

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 5000 );
//    camera.position.x = 100;
//    camera.position.y = -300;
//    camera.position.z = -200;
//    camera.rotation.x = 2.8;
    camera.rotation.z = Math.PI/2;

    key_iter = model.modelLayersMap.keys();
    layers = 0;
    let color = new THREE.Color(0, 1, 1);
    let z = 0;
    for (let key of key_iter) {
        let layer = this.model.modelLayersMap.get(key);
        let tensor = layer.result.tensor;
        let shape = tensor.shape;
        if (key.includes("input")) {
//            scene.add(generateGeometryForImage(tensor, 1));
//            z = 10;
        } else if (shape && key.includes("pooling") && key != "averagepooling2d_1") {
            console.log(key);
            //rb
            //rg
            //gb
            if (color.r < 1 && color.b > 0) {
                color.b = color.b - .1;
                color.r = color.r + .1;
//            } else {
//                color.g = color.g - .2;
//                color.b = color.b + .2;                                
            }
            let c = shape[2];
            var blocks = [1, 1];
            if (c > 64) {
                blocks = getNewZ(c);
            }
            let points = generateGeometryForTensor(tensor, z, blocks, color);
            if (shape.length > 2) {
                var newC = c / (blocks[0] * blocks[1]);
                z = z + newC * space * 3 / 2;
            }
            scene.add(points);
            layers++;
        } else if (key.includes("prediction")) {
            scene.add(generateGeometryForPredictions(tensor, z));
        }
    }
    // Set up the center to be the middle of the Z axis
    center.z = z / 2;
    distance = z / 2 + 250;
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    
    document.body.appendChild( renderer.domElement );
}


function refresh() {
    camera.position.y = distance * Math.cos(theta) + center.y;
    camera.position.z = distance * Math.sin(theta) + center.z;
    camera.lookAt(center);
    camera.rotation.z = Math.PI/2;
    renderer.render(scene, camera);
}
