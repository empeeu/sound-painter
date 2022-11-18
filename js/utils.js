function toggelShowHidState(element){
    console.log("Toggling visibility");
    console.log(element);
    if (element.style.visibility === "hidden"){
        element.style.visibility = "visible";
    } else {
        element.style.visibility = "hidden";
    }
}