const Mode = Object.freeze({
    INPUT: 'input',
    ARTVIEW: 'artview',
    PDF: 'pdf',
});

let mode = Mode.INPUT;

class View {
    static get Mode() { return Mode; }

    static get mode() { return mode; }
    static set mode(val) { mode = val; }
}

export default View;
export { View }