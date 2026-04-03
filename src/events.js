
let EventsType = Object.freeze({
    DeckLoading: "DeckLoading",
    DeckLoaded: "DeckLoaded",
    ViewChanged: "ViewChanged",
    PdfCreated: "PdfCreated",
    PdfCreating: "PdfCreating",
    StorageChanged: "StorageChanged",
    ScryfallOpened: "ScryfallOpened",
    ScryfallClosed: "ScryfallClosed",
    CardFlipped: "CardFlipped",
    CardChanged: "CardChanged",
    ChangeFinished: "ChangeFinished",
    CardAdded: "CardAdded",
    CardRemoved: "CardRemoved",
    ScrollingToCard: "ScrollingToCard",
    FilterChanged: "FilterChanged",
    TutorialStarted: "TutorialStarted",
    TutorialEnded: "TutorialEnded",
    TokenAdded: "TokenAdded",
    TokenRemoved: "TokenRemoved",
    NeededTokensChanged: "NeededTokensChanged",
    CardLoaded: "CardLoaded",
});

class Events {

    static get Type() { return EventsType; }

    static on(type, handler) { document.addEventListener(type, handler); }
    static remove(type, handler) { document.removeEventListener(type, handler); }
    static dispatch(type, data) { document.dispatchEvent(new MessageEvent(type, { data: data })); }
}

export default Events;
export { Events };