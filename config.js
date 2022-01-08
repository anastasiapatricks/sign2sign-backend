const config = {
    signRecognition: {
        MODEL_ENDPOINT: process.env.SIGN_RECOGNITION_MODEL_ENDPOINT,
        CAPTURE_INFO_TTL: 60,
        CAPTURE_INFO_CHECK: 30,
        NUM_FRAMES: 32,
        PREDICTION_INTERVAL: 16,
        PREDICTION_LABELS: [
            'buy',
            'do',
            'eat',
            'fine',
            'go',
            'hamburger',
            'hi_hello',
            'how',
            'i_me',
            'leave',
            'long',
            'lunch',
            'no',
            'perfect',
            'pizza',
            'same',
            'since',
            'thanks_thank_you',
            'time',
            'together',
            'want',
            'water',
            'what',
            'yes',
            'you'
        ]
    }
}

module.exports = config;
