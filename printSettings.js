import PDFDocument from './wrapper/PDFDocument.js';
import CropMark from './cropmark.js';

function getSettings(options, ptToUnit) {
    let settings = {};
    ptToUnit = ptToUnit || 1;

    settings.scaling = options?.scaling || 1;
    settings.cardMargin = options?.cardMargin || 0;
    settings.borderMargin = options?.borderMargin || 5;
    settings.pageFormat = options?.pageFormat || "A4";
    settings.cropMarkShape = options?.cropMarkShape || CropMark.LINES;
    settings.cropMarkColor = options?.cropMarkColor || 'white';
    let cropMarkSize = options?.cropMarkSize || 5;
    settings.cropMarkWidth = options?.cropMarkWidth || .5;

    let doc = new PDFDocument({ size: settings.pageFormat });
    settings.doc = doc;

    const mmToPt = 2.8346456693;

    settings.cropMarkSize = cropMarkSize * .5 * mmToPt * ptToUnit;

    settings.pageHeight = doc.page.height * ptToUnit;
    settings.pageWidth = doc.page.width * ptToUnit;

    const margin = settings.borderMargin * mmToPt * ptToUnit;
    settings.cardMargin = settings.cardMargin * mmToPt * ptToUnit;

    settings.mtgWidth = 63.5 * settings.scaling * mmToPt * ptToUnit;
    settings.mtgHeight = 88.9 * settings.scaling * mmToPt * ptToUnit;

    settings.cornerRadius = 3 * options.scaling * mmToPt * ptToUnit;

    settings.xCnt = Math.floor((settings.pageWidth - 2 * margin - settings.mtgWidth) / (settings.mtgWidth + settings.cardMargin)) + 1;
    settings.yCnt = Math.floor((settings.pageHeight - 2 * margin - settings.mtgHeight) / (settings.mtgHeight + settings.cardMargin)) + 1;

    settings.marginX = (settings.pageWidth - settings.xCnt * (settings.mtgWidth + settings.cardMargin) + settings.cardMargin) / 2;
    settings.marginY = (settings.pageHeight - settings.yCnt * (settings.mtgHeight + settings.cardMargin) + settings.cardMargin) / 2;

    return settings;
}

export default getSettings;
export { getSettings };