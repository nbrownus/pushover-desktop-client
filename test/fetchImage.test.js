var PushoverDesktopClient = require('../index.js')
  , should = require('should')
  , path = require('path')
  , EventEmitter = require('events').EventEmitter
  , fs = require('fs')

describe('#fetchImage', function () {

    it('Should not fetch images if no image cache location was provided', function (done) {
        var pdc = new PushoverDesktopClient({})

        pdc.fetchImage('test', function (result) {
            result.should.equal(false)
            done()
        })
    })

    it('Should return the image path early if the image is already cached', function (done) {
        var tmpDir = path.join(process.cwd(), '.tmp')
          , icon = 'testExists'
          , iconPath = path.join(tmpDir, icon)
          , pdc = new PushoverDesktopClient({ imageCache: tmpDir, iconHost: 'testHost' })

        fs.writeFileSync(iconPath, 'testing')

        pdc.https.request = function () {
            done(new Error('Should not have made an https request'))
        }

        pdc.fetchImage(icon, function (imageFile) {
            imageFile.should.equal(iconPath)
            done()
        })
    })

    it('Should fetch an image from the provided image host', function (done) {
        var tmpDir = path.join(process.cwd(), '.tmp')
          , icon = 'testFetch'
          , iconPath = path.join(tmpDir, icon)
          , pdc = new PushoverDesktopClient({ imageCache: tmpDir, iconHost: 'testHost' })
          , request = new EventEmitter()
          , response = new EventEmitter()
          , ended = false

        request.end = function () {
            ended = true
        }

        response.pipe = function (writer) {
            writer.write('testing')

            response.statusCode = 200
            setTimeout(function () {
                response.emit('end')
            }, 100)
        }

        pdc.https.request = function (options, callback) {
            options.host.should.equal('testHost')
            options.method.should.equal('GET')
            options.path.should.equal('/icons/' + icon)

            callback(response)
            return request
        }

        pdc.fetchImage(icon, function (imageFile) {
            imageFile.should.equal(iconPath)
            ended.should.equal(true)

            fs.readFileSync(iconPath).toString().should.equal('testing', 'Icon file contents were wrong')

            done()
        })
    })

    it('Should log fetch errors while fetching the image', function (done) {
        var tmpDir = path.join(process.cwd(), '.tmp')
          , icon = 'testFail1'
          , logger = {}
          , pdc = new PushoverDesktopClient({ imageCache: tmpDir, iconHost: 'testHost', logger: logger })
          , request = new EventEmitter()
          , logged = false

        logger.log = function () {}

        logger.error = function () {
            logged = true
        }

        request.end = function () {}

        pdc.https.request = function () {
            setTimeout(function () {
                var error = new Error('testError')
                request.emit('error', error)
            })

            return request
        }

        pdc.fetchImage(icon, function (imageFile) {
            imageFile.should.equal(false)
            logged.should.equal(true)
            done()
        })
    })

    it('Should log fetch errors while writing the image', function (done) {
        var tmpDir = path.join(process.cwd(), '.tmp')
          , icon = 'testFail2'
          , logger = {}
          , pdc = new PushoverDesktopClient({ imageCache: tmpDir, iconHost: 'testHost', logger: logger })
          , request = new EventEmitter()
          , response = new EventEmitter()
          , logged = false

        logger.log = function () {}

        logger.error = function () {
            logged = true
        }

        request.end = function () {}

        response.pipe = function (writer) {
            throw new Error('testError')
        }

        pdc.https.request = function (options, callback) {
            callback(response)
            return request
        }

        pdc.fetchImage(icon, function (imageFile) {
            imageFile.should.equal(false)
            logged.should.equal(true)
            done()
        })
    })

    it('Should log fetch errors if the response statusCode was not 200', function (done) {
        var tmpDir = path.join(process.cwd(), '.tmp')
          , icon = 'testFail3'
          , logger = {}
          , pdc = new PushoverDesktopClient({ imageCache: tmpDir, iconHost: 'testHost', logger: logger })
          , request = new EventEmitter()
          , response = new EventEmitter()
          , logged = false

        logger.log = function () {}

        logger.error = function () {
            logged = true
        }

        request.end = function () {}

        response.pipe = function (writer) {
            response.statusCode = 404
            setTimeout(function () {
                response.emit('end')
            }, 100)

        }

        pdc.https.request = function (options, callback) {
            callback(response)
            return request
        }

        pdc.fetchImage(icon, function (imageFile) {
            imageFile.should.equal(false)
            logged.should.equal(true)
            done()
        })
    })

})