import getSettings from './printSettings.js';
//import getDataUrl from './image.js';
import CropMark from './cropmark.js';

class ImageDocumentPreview {
    constructor(options) {
        this.options = options;

        this.cards = [];
    }

    addCard(count, card) {
        this.cards.push({ count, card });
    }

    create(updateCallback) {
        const ptToPx = 1.333;

        let settings = getSettings(this.options, ptToPx);

        let svg = document.createElement('svg');

        svg.setAttribute('version', '1.1');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        var imgNr = 0;

        let cards1 = this.cards.map(card => Array(card.count).fill(card.card)).flat(1);
        let cards2 = cards1.map(card => card.imageUris.map((u, i) => ({ card, u, i }))).flat(1);
        let cards = cards2.map(x => ({ imageUri: x.u, highResImageUri: x.card.highResImageUris[x.i] }));

        var maxStep = cards.length * 5;

        let pageNr = 0;
        let progress = 0;

        updateCallback(0);

        while (imgNr < cards.length) {
            pageNr++;

            let pageGroup = document.createElement('g');
            pageGroup.setAttribute('id', `page${pageNr}`);
            pageGroup.setAttribute('transform', `translate(0,${(pageNr - 1) * (settings.pageHeight + 16)})`);
            svg.appendChild(pageGroup);

            let page = document.createElement('rect');

            page.setAttribute('stroke', 'black');
            page.setAttribute('fill', 'white');
            page.setAttribute('width', settings.pageWidth);
            page.setAttribute('height', settings.pageHeight);

            pageGroup.appendChild(page);

            for (let y = 0, yPos = settings.marginY; y < settings.yCnt && imgNr < cards.length; y++, yPos += settings.mtgHeight + settings.cardMargin) {
                for (let x = 0, xPos = settings.marginX; x < settings.xCnt && imgNr < cards.length; x++, xPos += settings.mtgWidth + settings.cardMargin, imgNr++) {

                    let card = cards[imgNr];

                    let img = document.createElement('image');

                    img.setAttribute('x', xPos);
                    img.setAttribute('y', yPos);
                    img.setAttribute('width', settings.mtgWidth);
                    img.setAttribute('height', settings.mtgHeight);
                    img.setAttribute('xlink:href', card.imageUri);

                    //getDataUrl(card.highResImageUri).then(dataUrl => { img.setAttribute('href', dataUrl); });

                    pageGroup.appendChild(img);

                    progress++;
                    updateCallback(progress / maxStep);
                }
            }

            let cl_2 = settings.cropMarkSize / 2;

            if (settings.cropMarkShape != CropMark.NONE)
                for (let y = 0, yPos = settings.marginY; y <= settings.yCnt; y++, yPos += settings.mtgHeight + settings.cardMargin) {
                    for (let x = 0, xPos = settings.marginX; x <= settings.xCnt; x++, xPos += settings.mtgWidth + settings.cardMargin) {
                        {
                            switch (settings.cropMarkShape) {
                                case CropMark.STAR:
                                    {
                                        let inset = cl_2 * .9;
                                        let insetO = cl_2 - inset;

                                        let star = document.createElement('path');
                                        star.setAttribute('stroke-width', '0');
                                        star.setAttribute('fill', settings.cropMarkColor);
                                        star.setAttribute('d', `M ${xPos - cl_2},${yPos} `
                                            + `c ${inset},${insetO} ${inset},${insetO} ${cl_2},${cl_2} `
                                            + `c ${insetO},-${inset} ${insetO},-${inset} ${cl_2},-${cl_2} `
                                            + `c -${inset},-${insetO} -${inset},-${insetO} -${cl_2},-${cl_2} `
                                            + `c -${insetO},${inset} -${insetO},${inset} -${cl_2},${cl_2}`);

                                        pageGroup.appendChild(star);
                                    }
                                    break;
                                case CropMark.LINES:
                                default:
                                    {
                                        let line = document.createElement('path');

                                        line.setAttribute('stroke-width', settings.cropMarkWidth);
                                        line.setAttribute('stroke', settings.cropMarkColor);
                                        line.setAttribute('stroke-linecap', 'round');
                                        line.setAttribute('fill', 'transparent');
                                        line.setAttribute('d', `M${xPos},${yPos - cl_2} v${settings.cropMarkSize} M${xPos - cl_2},${yPos} h${settings.cropMarkSize}`);

                                        pageGroup.appendChild(line);
                                    }
                                    break;
                            }
                        }
                    }
                }
        }

        svg.setAttribute('viewBox', `0 0 ${settings.pageWidth} ${pageNr * (settings.pageHeight + 16) - 16}`);
        svg.setAttribute('width', settings.pageWidth);
        svg.setAttribute('height', pageNr * (settings.pageHeight + 16) - 16);
        svg.setAttribute('style', 'width:100%; height:auto;');
        
        return svg;
    }
}

export default ImageDocumentPreview;
export { ImageDocumentPreview };