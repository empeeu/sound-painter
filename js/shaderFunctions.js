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

  