// Setup the default data model
sndptrDM = {
    mode: "build", // Modes are is "play" for playing a level and "build" for building one
    level: null, // Could be a link to a json level, or just pure json
    window: {
        aspect: 16/9
    },
    // Properties related to the shader
    sourceType: 1, // 0 is hard, 1 is soft
    edgeBCType: 0, // 0: open, 1: ridgid, 2: free, 3: periodic
}