
const config = require('./config');

const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
const { default: axios } = require('axios');

const captureInfoCache = new NodeCache({
    stdTTL: config.signRecognition.CAPTURE_INFO_TTL,
    checkperiod: config.signRecognition.CAPTURE_INFO_CHECK,
    useClones: false
});

const predictionController = (ws, req) => {
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

const signRecogntionController = (ws, req) => {
    ws.id = uuidv4();

    ws.on('message', async message => {
        const cc = captureInfoCache.get(ws.id) || {
            frames: [],
            predictions: [],
            lastPredictedFrame: 0,
            lastResult: null
        };

        await (async () => {
            const frame = JSON.parse(message);
            cc.frames = pushFrame(cc.frames, frame);
    
            const n = cc.frames.length;
            const { NUM_FRAMES, PREDICTION_INTERVAL } = config.signRecognition;
            if (n < NUM_FRAMES || n - cc.lastPredictedFrame < PREDICTION_INTERVAL) {
                return;
            }
    
            const { NUM_CONSECUTIVE_PREDICTIONS, MIN_PREDICTION_CONFIDENCE } = config.signRecognition;
            try {
                const frames = cc.frames.slice(-NUM_FRAMES);
                const predictionArray = await predictFrames(frames.map(f => f.data));
    
                const prediction = argMax(predictionArray);
                const confidence = predictionArray[prediction];

                cc.predictions.push(prediction);
                cc.lastPredictedFrame = n;
    
                const prev = cc.predictions.slice(-NUM_CONSECUTIVE_PREDICTIONS);
                if (prev.length < NUM_CONSECUTIVE_PREDICTIONS || prev.some(val => val != prediction)) {
                    return;
                }

                if (prediction == cc.lastResult || confidence < MIN_PREDICTION_CONFIDENCE) {
                    return;
                }
                
                cc.lastResult = prediction;
                ws.send(config.signRecognition.PREDICTION_LABELS[prediction]);
    
            } catch (error) {
                // console.log(error)
                // console.log(error.response);
            }
        })()

        captureInfoCache.set(ws.id, cc);
    });

    ws.on('close', () => {
        captureInfoCache.del(ws.id);
    });
}

const predictFrames = async (frames) => {
    const res = await axios.post(
        config.signRecognition.MODEL_ENDPOINT,
        { data: [frames] }
    );
    return res.data.result[0][0];
}

const argMax = (arr) => {
    var max = arr[0];
    var maxIndex = 0;

    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

const pushFrame = (frames, frame) => {
    if (frames.length == 0) {
        return [frame]
    }

    const lastFrame = frames[frames.length - 1];
    const millisDiff = frame.time - lastFrame.time;
    const numDuplicate = Math.max(Math.floor(millisDiff * 30 / 1000) - 2, 0);
    return [
        ...frames,
        ...Array(numDuplicate).fill(lastFrame),
        frame
    ]
}

module.exports = {
    signRecogntionController
}