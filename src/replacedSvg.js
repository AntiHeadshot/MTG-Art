for (let elem of document.querySelectorAll(".replacedSvg")) {
    var parent = elem.parentElement;
    var attributes = elem.attributes;
    parent.innerHTML = await (await fetch(elem.getAttribute('data'))).text();
    let newElement = parent.lastChild;

    for (let attr of attributes) {
        newElement.setAttribute(attr.name, attr.value);
    }
}