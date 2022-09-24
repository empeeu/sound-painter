// grab the container
let probeContainer = document.getElementById("pressureProbePlot");

// Strategy is as follows
//  *********** Main container ******************
//  * |*********** Plot Canvas ***************  *
//  * -*                                     *  *
//  * |*                                     *  *
//  * |***************************************  *
//  * ----------------------------------------  *
//  *                                           *
//  ********************************************
// The draw canvas has margins all around
// the axes is a canvas ON TOP of the draw canvas -- more static
// and takes up full container size