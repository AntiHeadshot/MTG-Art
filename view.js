const Mode = Object.freeze({
    INPUT: 'input',
    ARTVIEW: 'artview',
    PDF: 'pdf',
});

let mode = Mode.INPUT;

class View {
    static get mode() { return mode; }
    static set mode(val) { mode = val; }
}

export {
    Mode, View
}