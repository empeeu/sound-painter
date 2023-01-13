function updateActiveShader(e, elem){
    let select = document.getElementById('shader-type-selector');
    if (select.value == "pressureFragmentShader"){
        planeMaterial2.fragmentShader = sndptr.colorFragmentShader;
        planeMaterial2.needsUpdate = true;
        planeMaterial.fragmentShader = sndptr.pressureFragmentShader;
        planeMaterial.needsUpdate = true;
    } else if (select.value == "pressureFragmentShader4thOrder") {
        planeMaterial2.fragmentShader = sndptr.colorFragmentShaderAmplitude;
        planeMaterial2.needsUpdate = true;
        planeMaterial.fragmentShader = sndptr.pressureFragmentShader4thOrder;
        planeMaterial.needsUpdate = true;
    }
  };

  
  function updateShaderUniforms(simTime){
    let select = document.getElementById('shader-type-selector');
    renderer.setRenderTarget(textureRing[2]);
    renderer.render(bufferScene, camera);
    uniforms.time.value = uniforms.time.value + dt;
    if (select.value == "pressureFragmentShader"){
        textureRing = [textureRing[1], textureRing[2], textureRing[0]];
        uniforms.p0I.value = textureRing[0].texture;
        uniforms.p1I.value = textureRing[1].texture;
    } else if (select.value == "pressureFragmentShader4thOrder") {
        uniforms.p0I.value = textureRing[2].texture;
        textureRing = [textureRing[0], textureRing[2], textureRing[1]];
    }
    uniforms.walls.value = drawingTexture;  
}