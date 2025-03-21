// In a new file `utils/imageVerification.js`
const Tesseract = require('tesseract.js');

const extractTextFromImage = async (imagePath) => {
    try {
        const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
        return text;
    } catch (error) {
        console.error('Error extracting text from image:', error);
        throw error;
    }
};

module.exports = { extractTextFromImage };