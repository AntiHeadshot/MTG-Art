class Deck {
    constructor() {
        this.cards = [];
    }

    getNextIndex() { return this.cards.length ? (this.cards[this.cards.length - 1].index + 1) : 0; }

    push(card) {
        this.cards.push(card);
        Events.dispatch(Events.Type.CardAdded, card);
    }

    pushAfter(card, after) {
        const index = this.cards.indexOf(after);

        card.index = index + 1;
        card.order = after.order++;

        this.push(card);

        if (index !== -1) {
            this.cards.splice(index + 1, 0, this.cards.pop()); // Move newCard to after the given card
        }
    }

    splice(card) {
        this.cards.splice(this.cards.indexOf(card), 1);
        Events.dispatch(Events.Type.CardRemoved, card);
    }

    updateCardOrder() {
        let cardIdx = 0;
        let cardOrder = 0;
        for (const card of this.cards) {
            card.index = cardIdx++;

            card.setOrder(cardOrder);
            if (!card.isUnset)
                cardOrder++;

            card.updateElem();
        }
    }

    print() { return this.cards.map(c => c.getDescription()).join("\n"); }

    filter(fn) { return this.cards.filter(fn); }
    find(fn) { return this.cards.find(fn); }
    findLast(fn) { return this.cards.findLast(fn); }
    some(fn) { return this.cards.some(fn); }
}

export default Deck;