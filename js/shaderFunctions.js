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
    uniforms.walls.value = drawingTexture;  
    uniforms.time.value = simTime;
    if (select.value == "pressureFragmentShader"){
        textureRing = [textureRing[2], textureRing[0], textureRing[1]];
        planeMaterial.uniforms.p0I.value = textureRing[2].texture;
        planeMaterial.uniforms.p1I.value = textureRing[1].texture;
    } else if (select.value == "pressureFragmentShader4thOrder") {
        textureRing = [textureRing[1], textureRing[0], textureRing[2]];
        planeMaterial.uniforms.p0I.value = textureRing[1].texture;
    }
    renderer.setRenderTarget(textureRing[0]);
    renderer.render(bufferScene, camera);
}