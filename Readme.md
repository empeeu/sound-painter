Website: https://empeeu.github.io/sound-painter/

* TODOs:
    * [x] source painting
        * The MAP of HSV to frequency is probably not quite right... need to figure this one out... hmmm...
        * probably need a reverse texture. 
    * [x] Drawing eraser
        * This needs to be fixed -- right now everytime you draw everything is erased
    * [x] A moving source with the mouse
    * ~~[] 3D vs 2D sound option~~
    * [x] attenuation
    * [x] Switch over to RGBA pressure textures for colored waves
    * [x] fix mouse prober source
    * [x] Sound prober microphone
    * [x] Refactor
    * [...] Make a oscilloscope for the sound prober
       * [ ] Add title for time
       * [x] Add number inputs to change the x-y limits
       * [ ] Add another SVG container as an overlay for the plot
    * [ ] Fix source term amplitudes
    * [ ] Go to higher order numerics
    * [ ] need an overlay to show where you are drawing the line
    * [ ] Set up state in JSOn format so we can reload as needed
       * [ ] Rework the data structure
    * [x] reset the pressure field
    * [x] Draw lines
    * [ ] import png
    * [ ] Start time at 0


# Useful references
* https://gamedevelopment.tutsplus.com/tutorials/quick-tip-how-to-render-to-a-texture-in-threejs--cms-25686  -- The GOOD one
* https://github.com/PavelDoGreat/WebGL-Fluid-Simulation/blob/master/script.js
* https://paveldogreat.github.io/WebGL-Fluid-Simulation/
* https://stackoverflow.com/questions/21533757/three-js-use-framebuffer-as-texture#comment32726524_21651562
* https://github.com/mrdoob/three.js/blob/master/examples/webgl_framebuffer_texture.html
* https://29a.ch/2012/12/16/webgl-fluid-simulation
* https://mofu-dev.com/en/blog/stable-fluids