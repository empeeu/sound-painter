// This is the HTML element that houses the threejs canvas
var container = document.getElementById("container");

/////////////////// This is for our Drawing CANVAS
const drawStartPos = new THREE.Vector2();
var drawColor = "#00000000";
var drawWidth = 2;
var drawingContext;
var drawingTexture = setupCanvasDrawing();
var mouseSource = false;
var mouseProbe = false;
updateDrawColor();

///////////////////This is the basic scene setup
var scene = new THREE.Scene();
var widthContainer = container.offsetWidth;
var heightContainer = container.offsetHeight;
var camera = new THREE.OrthographicCamera(- widthContainer / 2, widthContainer / 2, heightContainer / 2, - heightContainer / 2, -1000, 1000);
camera.position.z = 10;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(widthContainer, heightContainer);
container.appendChild(renderer.domElement);

///////////////////This is where we create our off-screen render target
//Create a different scene to hold our buffer objects
var initScene = new THREE.Scene();
var bufferScene = new THREE.Scene();
//Create the textures that will store our results and intermediate
var widthDomain = widthContainer;
var heightDomain = heightContainer;

var pressureTexture0 = new THREE.WebGLRenderTarget(
    widthDomain, heightDomain, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        type: THREE.FloatType,
        // format: THREE.RedFormat
    });
    var pressureTexture1 = new THREE.WebGLRenderTarget(
        widthDomain, heightDomain, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
            type: THREE.FloatType,
            // format: THREE.RedFormat
            
        });
        var pressureTexture2 = new THREE.WebGLRenderTarget(
            widthDomain, heightDomain, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.NearestFilter,
                type: THREE.FloatType,
                // format: THREE.RedFormat
            });
            
            var textureRing = [pressureTexture0, pressureTexture1, pressureTexture2];
            
            // Create an initialization shader 
            var initMaterial = new THREE.ShaderMaterial({
                vertexShader: sndptr.vertexShader,
                fragmentShader: sndptr.initFragmentShader
            });
            // var planeMaterial = new THREE.MeshBasicMaterial({ color: 0x7074FF });
/// We attach this shader to a plane and add it to our buffer scne
var initPlane = new THREE.PlaneGeometry(widthContainer, heightContainer);
var initPlaneObject = new THREE.Mesh(initPlane, initMaterial);
initPlaneObject.position.z = 0;
initScene.add(initPlaneObject);//We add it to the bufferScene instead of the normal scene!

// Now create the supporing data
// initial pressure source
var source = new THREE.Vector4(0.5, 0.5, 0, 64);

// discretization. We assume the domain has a maximum dimension of 1
// and then the other dimension depends on the aspect ratio
if (widthContainer < heightContainer) {
    var domainSizeWorld = new THREE.Vector2(1 * widthContainer / heightContainer, 1);
} else {
    var domainSizeWorld = new THREE.Vector2(1, 1 * heightContainer / widthContainer);
}
var dxdy = new THREE.Vector2(domainSizeWorld.x / widthDomain, domainSizeWorld.y / heightDomain);

// The u-v coordinates can be finer / coarser than the dxdy of the computational domain. 
// so, we need a conversion between the two
var pxpy = new THREE.Vector2(1 / widthDomain, 1 / heightDomain);

var c = 1.0;  // speed of sound
var dt = 0.95 / Math.sqrt(2) * Math.min(dxdy.x, dxdy.y) / c;

///Create the uniforms for the computations
uniforms = {
    time: { value: 0.0 },
    p0I: { type: "t", value: pressureTexture0.texture },
    p1I: { type: "t", value: pressureTexture1.texture },
    source: { value: source },
    dxdy: { value: dxdy },
    pxpy: { value: pxpy },
    domain: { value: domainSizeWorld },
    c: { value: c },
    dt: { value: dt },
    walls: {
        type: "t",
        value: drawingTexture
    },
    textSourceAmp: { value: 25.0 },
    textSourceFreq: { value: widthDomain / 8 },
    absorpCoeff: { value: 0.0 }
};
/// This is the material that houses the custom shader that does the computation
var planeMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: sndptr.vertexShader,
    fragmentShader: sndptr.pressureFragmentShader
    
});
// var planeMaterial = new THREE.MeshBasicMaterial({ color: 0x7074FF });
/// We attach this shader to a plane and add it to our buffer scne
var plane = new THREE.PlaneGeometry(widthContainer, heightContainer);
var planeObject = new THREE.Mesh(plane, planeMaterial);
planeObject.position.z = 0;
bufferScene.add(planeObject);//We add it to the bufferScene instead of the normal scene!


////////////////////////////Now we use our pressureTexture as a material to render it onto our main scene
uniforms2 = {
    pI: { value: pressureTexture2.texture },
};
var planeMaterial2 = new THREE.ShaderMaterial({
    uniforms: uniforms2,
    vertexShader: sndptr.vertexShader,
    fragmentShader: sndptr.colorFragmentShader
});
var plane2 = new THREE.PlaneGeometry(widthContainer, heightContainer);
var mainPlaneObject = new THREE.Mesh(plane2, planeMaterial2);
mainPlaneObject.position.z = 0;
scene.add(mainPlaneObject);


// Finally, we need to setup our probe plotter and save the context for later drawing
////////////////// This is for probing the pressure values
var pressureBuf = new Float32Array(4);
var pressureHist = [];  // History of pressure values for probe plotting
var probeContext = setupProbePlot();