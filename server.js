require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const WebSocket = require('ws');
const { signRecogntionController } = require('./signRecognition');
const { consumers } = require('stream');


const app = express();
const server = http.createServer(app);

server.listen(8080, function() {
    console.log('listening on 8080');
});

const wss = new WebSocket.Server({ server: server, path: "/signRecognition" });
wss.on('connection', signRecogntionController);

app.use(cors({
    origin: '*'
}));

app.use("/login", (req, res) => {
    res.send({
        token: "test123",
    });
});

MongoClient.connect(process.env.DB_CONNECTION_STRING)
  .then(client => {
    const db = client.db('Sign2Sign');
    const userCollection = db.collection('User');
    const wordCollection = db.collection('Word');
    const lessonCollection = db.collection('Lesson');

    // Get user by userId
    app.get('/users/:userId', (req, res) => {
        userCollection.findOne( { _id: new ObjectId(req.params['userId']) } )
            .then(result => { res.send(result) })
            .catch(error => console.error(error));
        })

    // Get progress from user
    app.get('/progress', async (req, res) => {
        const user = await userCollection.findOne({ _id: new ObjectId('61b1cb9f81c41c229c1a99d9') });
        const progress = user.progress;

        const lesson = await lessonCollection.findOne(
            { lessonId: progress.lesson.lessonId },
            { projection: { _id: 0, title: 1, img: 1 } }
        );
        
        const vocab = await lessonCollection.aggregate([
            { "$unwind": "$vocabularies" },
            {
                "$match": { 
                    "lessonId": progress.vocabulary.lessonId,
                    "vocabularies.vocabIndex": progress.vocabulary.vocabIndex
                }
            },
            {
                $project: {
                    _id: 0,
                    vocabularies: {
                        title: 1,
                        img: 1,
                    }
                }
            }
        ]).toArray()
        
        const vocabInfo = vocab[0]['vocabularies']

        const convo = await lessonCollection.aggregate([
            { "$unwind": "$conversations" },
            {
                "$match": { 
                    "lessonId": progress.conversation.lessonId,
                    "conversations.convoIndex": progress.conversation.convoIndex
                }
            },
            {
                $project: {
                    _id: 0,
                    conversations: {
                        title: 1,
                        img: 1
                    }
                }
            }
        ]).toArray()

        const convoInfo = convo[0]['conversations']

        progress['lesson'] = {...progress['lesson'], ...lesson}
        progress['vocabulary'] = {...progress['vocabulary'], ...vocabInfo}
        progress['conversation'] = {...progress['conversation'], ...convoInfo}

        res.send(progress)
    })
        
    // Get all vocabularies
    app.get('/vocabularies', (req, res) => {
        lessonCollection.aggregate([
            { "$unwind": "$vocabularies" },
            {
                $project: {
                    lessonId: 1,
                    vocabularies: {
                        vocabIndex: 1,
                        title: 1,
                        desc: 1,
                        img: 1
                    }
                }
            }
        ]).toArray()
        .then(result => {
            var vocabulary_list = [];
            result.forEach(function(item, index) {
                vocabulary_list.push(
                    {
                        'lessonId': item['lessonId'],
                        'vocabIndex': item['vocabularies']['vocabIndex'],
                        'title': item['vocabularies']['title'],
                        'desc': item['vocabularies']['desc'],
                        'img': item['vocabularies']['img']
                    }
                )
            })

            res.send({ 'vocabularies': vocabulary_list });
        })
        .catch(error => console.error(error))
    })

    // Get vocabulary by lessonIndex and vocabularyIndex
    app.get('/lessons/:lessonId/vocabularies/:vocabIndex', (req, res) => {
        lessonCollection.aggregate([
            { "$unwind": "$vocabularies" },
            {
                "$match": { 
                    "lessonId": parseInt(req.params['lessonId']),
                    "vocabularies.vocabIndex": parseInt(req.params['vocabIndex'])
                }
            },
            {
                $project: {
                    _id: 0,
                    vocabularies: {
                        title: 1,
                        words: 1,
                        quizSentences: 1
                    }
                }
            }
        ]).toArray()
        .then(result => { res.send(result[0]['vocabularies']) })
        .catch(error => console.error(error))
    })

    // Get all conversations
    app.get('/conversations', (req, res) => {
        lessonCollection.aggregate([
            { "$unwind": "$conversations" },
            {
                $project: {
                    lessonId: 1,
                    conversations: {
                        convoIndex: 1,
                        title: 1,
                        img: 1
                    }
                }
            }
        ]).toArray()
        .then(result => {
            var conversationList = [];
            result.forEach(function(item, index) {
                conversationList.push(
                    {
                        'lessonId': item['lessonId'],
                        'convoIndex': item['conversations']['convoIndex'],
                        'title': item['conversations']['title'],
                        'img': item['conversations']['img']
                    }
                )
            })

            res.send({ 'conversations': conversationList });
        })
        .catch(error => console.error(error))
    })

    // Get conversation by lessonIndex and conversationIndex
    app.get('/lessons/:lessonId/conversations/:convoIndex', (req, res) => {
        lessonCollection.aggregate([
            { "$unwind": "$conversations" },
            {
                "$match": { 
                    "lessonId": parseInt(req.params['lessonId']),
                    "conversations.convoIndex": parseInt(req.params['convoIndex'])
                }
            },
            {
                $project: {
                    _id: 0,
                    conversations: {
                        title: 1,
                        dialogue: 1
                    }
                }
            }
        ]).toArray()
        .then(result => { res.send(result[0]['conversations']) })
        .catch(error => console.error(error))
    })

    // Get all lessons
    app.get('/lessons', (req, res) => {
        lessonCollection.find( {}, { projection: { _id: 0, vocabularies: 0, conversations: 0 } }).toArray()
        .then(result => { res.send({ "lessons": result }) })
        .catch(error => console.error(error))
    })

    // Get lesson by lessonId
    app.get('/lessons/:lessonId', (req, res) => {
        lessonCollection.findOne( 
            { lessonId: parseInt(req.params['lessonId']) },
            { projection:
                { 
                    _id: 0, 
                    "vocabularies.title": 1,
                    "vocabularies.desc": 1,
                    "vocabularies.img": 1,
                    "conversations.title": 1,
                    "conversations.img": 1
                }
            }
        )
        .then(result => { res.send(result); })
        .catch(error => console.error(error))
    })

    // Get landmarks based on word
    app.get('/words/:key', (req, res) => {
        wordCollection.find( { key: req.params['key'] } ).toArray()
        .then(result => { res.send(result[0]); })
        .catch(error => console.error(error))
    })

  })
  .catch(console.error)

