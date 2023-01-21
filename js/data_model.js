// Setup the default data model
sndptrDM = {
    mode: "build", // Modes are is "play" for playing a level and "build" for building one
    level: null, // Could be a link to a json level, or just pure json
    window: {
        aspect: 16/9
    },
    // Properties related to the shader
    sourceType: 0, // 0 is hard, 1 is soft
    edgeBCType: 0, // 0: open, 1: ridgid, 2: free, 3: periodic
    shader: "Amplitude4th"
};

sndptrDMSpec = {
    shader: {
        type: "enum", 
        display: ["Frequency2nd", "Amplitude4th"],
        values: ["pressureFragmentShader", "pressureFragmentShader4thOrder"]
    },
    mode: {
        type: "enum",
        values: ["build", "play"]
    },
    level : {
        type: "string",
        help: "URL to level or just pure JSON"
    },
    window: {
        aspect: {
            type: "float", 
            help: "The aspect ratio of the window. This includes the render canvas and the whole UI."
        }
    },
    sourceType: {
        type: "int", 
        values: [0, 1],
        valueReference: ["hard", "soft"]
    },
    edgeBCType: {
        type: "int", 
        values: [0, 1, 2, 3],
        valueReference: ["open", "ridgid", "free", "periodic"],
        help: "This applies boundary conditions to the edge of the domain."
    }
};
