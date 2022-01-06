const config = {
    signRecognition: {
        MODEL_ENDPOINT: process.env.SIGN_RECOGNITION_MODEL_ENDPOINT,
        CAPTURE_INFO_TTL: 60,
        CAPTURE_INFO_CHECK: 30,
        NUM_FRAMES: 64,
        PREDICTION_INTERVAL: 16
    }
}

module.exports = config;
