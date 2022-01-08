
const config = require('./config');

const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
const { default: axios } = require('axios');

const captureInfoCache = new NodeCache({
    stdTTL: config.signRecognition.CAPTURE_INFO_TTL,
    checkperiod: config.signRecognition.CAPTURE_INFO_CHECK,
    useClones: false
});

const predictFrames = async (frames) => {
    const res = await axios.post(
        config.signRecognition.MODEL_ENDPOINT,
        { data: [frames] }
    );
    return res.data.result[0][0];
}

const signRecogntionController = (ws, req) => {
    ws.id = uuidv4();

    ws.on('message', message => {
        const frame = JSON.parse(message);

        const captureInfo = captureInfoCache.get(ws.id) || {
            frames: [],
            lastPrediction: 0
        };

        captureInfo.frames.push(frame);

        const n = captureInfo.frames.length;
        const { NUM_FRAMES, PREDICTION_INTERVAL } = config.signRecognition;
        
        if (n >= NUM_FRAMES && n - captureInfo.lastPrediction >= PREDICTION_INTERVAL) {
            captureInfo.lastPrediction = n;
            (async () => {
                try {
                    const frames = captureInfo.frames.slice(-NUM_FRAMES);

                    const prediction = {};
                    (await predictFrames(frames)).forEach((val, i) => {
                        const label = config.signRecognition.PREDICTION_LABELS[i];
                        prediction[label] = val;
                    });

                    ws.send(JSON.stringify(prediction));

                } catch (error) {
                    // console.log(error)
                    // console.log(error.response);
                }
            })()
        }

        captureInfoCache.set(ws.id, captureInfo);
    });

    ws.on('close', () => {
        captureInfoCache.del(ws.id);
    });
}

module.exports = {
    signRecogntionController
}