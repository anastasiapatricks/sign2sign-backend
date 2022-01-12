const config = {
    signRecognition: {
        MODEL_ENDPOINT: process.env.SIGN_RECOGNITION_MODEL_ENDPOINT,
        CAPTURE_INFO_TTL: 60,
        CAPTURE_INFO_CHECK: 30,
        NUM_FRAMES: 32,
        PREDICTION_INTERVAL: 8,
        PREDICTION_LABELS: [
            'buy',
            'do',
            'eat',
            'fine',
            'go',
            'hamburger',
            'hello',
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
            'thank_you',
            'time',
            'together',
            'want',
            'water',
            'what',
            'yes',
            'you'
        ],
        NUM_CONSECUTIVE_PREDICTIONS: 4,
        MIN_PREDICTION_CONFIDENCE: 0.9
    }
}

module.exports = config;
