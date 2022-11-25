function toggelShowHideState(element, input){
    // console.log(element);
    // console.log(input);
    let checked = false;
    if (input !== undefined){
        checked = input.checked;
    } else {
        if (element.style.visibility === "hidden"){
            checked = true;
        } else {
            checked = false;
        }
    } 
    console.log("Toggling visibility");
    if (checked){
        element.style.visibility = "visible";
    } else {
        element.style.visibility = "hidden";
    }
}