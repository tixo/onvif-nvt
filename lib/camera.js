const Url = require('url')
const EventEmitter = require('events').EventEmitter

/**
 * Wrapper class for all onvif modules to manage an Onvif device (camera).
 */
class Camera extends EventEmitter {
  constructor () {
    super() // must call super for "this" to be defined.

    this.core = null

    this.access = null
    this.accessrules = null
    this.action = null
    this.credential = null
    this.deviceio = null
    this.display = null
    this.door = null
    this.events = null
    this.imaging = null
    this.media = null // Onvif 1.x
    this.media2 = null // Onvif 2.x
    this.ptz = null
    this.receiver = null
    this.recording = null
    this.replay = null
    this.security = null
    this.snapshot = null
    this.thermal = null
    this.videoanalytics = null

    this.serviceAddress = null
    this.timeDiff = 0
    this.address = null
    this.port = null
    this.username = null
    this.password = null

    this.deviceInformation = null
    this.profileList = []
    this.defaultProfile = null
  }

  /**
   * Add a module to Camera. The available modules are:
   * <ul>
   * <li>access</li>
   * <li>accessrules</li>
   * <li>action</li>
   * <li>core - automatically added</li>
   * <li>credential</li>
   * <li>deviceio</li>
   * <li>display</li>
   * <li>door</li>
   * <li>events - automatically added based on capabilities</li>
   * <li>imaging - automatically added based on capabilities</li>
   * <li>media -  - automatically added based on capabilities</li>
   * <li>media2</li>
   * <li>ptz - automatically added based on capabilities</li>
   * <li>receiver</li>
   * <li>recording</li>
   * <li>replay</li>
   * <li>schedule</li>
   * <li>search</li>
   * <li>security</li>
   * <li>snapshot</li>
   * <li>thermal</li>
   * <li>videoanalytics</li>
   * </ul>
   * @param {string} name The name of the module.
   */
  add (name) {
    switch (name) {
      case 'access':
        if (!this.access) {
          this.access = require('./modules/access')
        }
        break
      case 'accessrules':
        if (!this.accessrules) {
          this.accessrules = require('./modules/accessrules')
        }
        break
      case 'action':
        if (!this.action) {
          this.action = require('./modules/action')
        }
        break
      case 'credential':
        if (!this.credential) {
          this.credential = require('./modules/credential')
        }
        break
      case 'core':
        if (!this.core) {
          this.core = require('./modules/core')
          this.core.init(this.serviceAddress, this.username, this.password)
        }
        break
      case 'deviceio':
        if (!this.deviceio) {
          this.deviceio = require('./modules/deviceio')
        }
        break
      case 'display':
        if (!this.display) {
          this.display = require('./modules/display')
        }
        break
      case 'door':
        if (!this.door) {
          this.door = require('./modules/door')
        }
        break
      case 'events':
        if (!this.imaging) {
          this.events = require('./modules/events')
        }
        break
      case 'imaging':
        if (!this.imaging) {
          this.imaging = require('./modules/imaging')
        }
        break
      case 'media':
        if (!this.media) {
          this.media = require('./modules/media')
          this.media.init(this.timeDiff, this.serviceAddress, this.username, this.password)
        }
        break
      case 'media2':
        if (!this.media2) {
          this.media2 = require('./modules/media2')
        }
        break
      case 'ptz':
        if (!this.ptz) {
          this.ptz = require('./modules/ptz')
        }
        break
      case 'receiver':
        if (!this.receiver) {
          this.receiver = require('./modules/receiver')
        }
        break
      case 'recording':
        if (!this.recording) {
          this.recording = require('./modules/recording')
        }
        break
      case 'replay':
        if (!this.replay) {
          this.replay = require('./modules/replay')
        }
        break
      case 'schedule':
        if (!this.schedule) {
          this.schedule = require('./modules/schedule')
        }
        break
      case 'search':
        if (!this.search) {
          this.search = require('./modules/search')
        }
        break
      case 'security':
        if (!this.security) {
          this.security = require('./modules/security')
        }
        break
      case 'snapshot':
        if (!this.snapshot) {
          this.snapshot = require('./utils/snapshot')
          let defaultProfile = this.getDefaultProfile()
          if (defaultProfile) {
            let snapshotUri = defaultProfile.snapshot
            this.snapshot.init(snapshotUri, this.username, this.password)
          }
        }
        break
      case 'thermal':
        if (!this.thermal) {
          this.thermal = require('./modules/thermal')
        }
        break
      case 'videoanalytics':
        if (!this.videoanalytics) {
          this.videoanalytics = require('./modules/videoanalytics')
        }
        break
      default:
        throw new Error(`Module '${name}' does not exist. Cannot add to Camera.`)
    }
  }

  connect (address, port, username, password, servicePath, callback) {
    return new Promise((resolve, reject) => {
      port = (typeof port !== 'undefined') ? port : 80
      username = (typeof username !== 'undefined') ? username : null
      password = (typeof password !== 'undefined') ? password : null
      servicePath = (typeof servicePath !== 'undefined') ? servicePath : '/onvif/device_service'

      this.address = address
      this.port = port

      this.setAuth(username, password)

      // set up the service address
      let serviceAddress = 'http://' + address
      if (port && port !== 80) {
        serviceAddress = serviceAddress + ':' + port
      }
      serviceAddress = serviceAddress + servicePath

      this.serviceAddress = Url.parse(serviceAddress)
      // if (username) {
      //   this.serviceAddress.auth = username
      //   if (password) {
      //     this.serviceAddress.auth = this.serviceAddress.auth + ':' + password
      //   }
      // }

      if (typeof address !== 'string' || address.length <= 0) {
        reject(new Error('address is required in constructor for Camera::connect()'))
        return
      }

      this.add('core')

      return this.coreGetSystemDateAndTime()
        .then(() => {
          return this.coreGetCapabilities()
        })
        .then(() => {
          return this.coreGetDeviceInformation()
        })
        .then(() => {
          return this.mediaGetProfiles()
        })
        .then(() => {
          return this.mediaGetStreamURI()
        })
        .then(() => {
          return this.mediaGetSnapshotUri()
        })
        .then(() => {
          return this.coreGetScopes()
        })
        .then(() => {
          let info = this.getInformation()
          resolve(info)
        })
        .catch(error => {
          reject(error)
        })
    })
  }

  setAuth (username, password) {
    if (typeof username === 'undefined') {
      this.username = null
    }
    else {
      this.username = username
    }
    if (typeof password === 'undefined') {
      this.password = null
    }
    else {
      this.password = password
    }
  }

  /**
   * Returns the ONVIF device's informaton. Available after connection.
  */
  getInformation () {
    let o = this.deviceInformation
    if (o) {
      return JSON.parse(JSON.stringify(o))
    }
    else {
      return null
    }
  }

  /**
   * Returns the default profile that will be used. Available after connection.
  */
  getDefaultProfile () {
    return this.defaultProfile
  }

  coreGetSystemDateAndTime () {
    return new Promise((resolve, reject) => {
      return this.core.getSystemDateAndTime()
        .then(results => {
          this.timeDiff = this.core.getTimeDiff()
          resolve(results)
        })
        .catch(error => {
          console.error(error)
          reject(error)
        })
    })
  }

  coreGetCapabilities () {
    return new Promise((resolve, reject) => {
      return this.core.getCapabilities()
        .then(results => {
          let c = results['data']['GetCapabilitiesResponse']['Capabilities']
          if (!c) {
            reject(new Error('Failed to initialize the device: No capabilities were found.'))
            return
          }
          // the appropriate modules will be automatically added
          // to camera based on the onvif device's capabilities.
          let events = c['Events']
          if (events && events['XAddr']) {
            this.add('events')
            let serviceAddress = Url.parse(events['XAddr'])
            this.events.init(this.timeDiff, serviceAddress, this.username, this.password)
          }
          let imaging = c['Imaging']
          if (imaging && imaging['XAddr']) {
            this.add('imaging')
            let serviceAddress = Url.parse(imaging['XAddr'])
            this.imaging.init(this.timeDiff, serviceAddress, this.username, this.password)
          }
          let media = c['Media']
          if (media && media['XAddr']) {
            this.add('media')
            let serviceAddress = Url.parse(media['XAddr'])
            this.media.init(this.timeDiff, serviceAddress, this.username, this.password)
          }
          let ptz = c['PTZ']
          if (ptz && ptz['XAddr']) {
            this.add('ptz')
            let serviceAddress = Url.parse(ptz['XAddr'])
            this.ptz.init(this.timeDiff, serviceAddress, this.username, this.password)
          }
          resolve()
        })
        .catch(error => {
          console.error(error)
          reject(error)
        })
    })
  }

  coreGetDeviceInformation () {
    return new Promise((resolve, reject) => {
      return this.core.getDeviceInformation()
        .then(results => {
          this.deviceInformation = results['data']['GetDeviceInformationResponse']
          resolve(results)
        })
        .catch(error => {
          console.error(error)
          reject(error)
        })
    })
  }

  coreGetScopes () {
    return new Promise((resolve, reject) => {
      return this.core.getScopes()
        .then(results => {
          let scopes = results['data']['GetScopesResponse']['Scopes']
          let ptz = false, name = '', hardware = '', country = '', city = ''
          scopes.forEach((scope) => {
            let s = scope['ScopeItem']
            if (s.indexOf('onvif://www.onvif.org/hardware/') === 0) {
              hardware = s.split('/').pop()
            }
            else if (s.indexOf('onvif://www.onvif.org/type/ptz') === 0) {
              ptz = true
            }
            else if (s.indexOf('onvif://www.onvif.org/location/country/') === 0) {
              country = s.split('/').pop()
            }
            else if (s.indexOf('onvif://www.onvif.org/location/city/') === 0) {
              city = s.split('/').pop()
            }
            else if (s.indexOf('onvif://www.onvif.org/name/') === 0) {
              name = s.split('/').pop()
              name = name.replace(/_/g, ' ')
            }
          })
          this.deviceInformation.Hardware = hardware
          this.deviceInformation.Ptz = ptz
          this.deviceInformation.Country = country
          this.deviceInformation.City = city
          this.deviceInformation.Name = name

          resolve(results)
        })
        .catch(error => {
          console.error(error)
          reject(error)
        })
    })
  }

  mediaGetProfiles () {
    return new Promise((resolve, reject) => {
      return this.media.getProfiles()
        .then(results => {
          let profiles = results['data']['GetProfilesResponse']['Profiles']
          if (!profiles) {
            reject(new Error('Failed to initialize the device: The targeted device does not any media profiles.'))
            return
          }
          let profileList = this.parseProfiles(profiles)
          this.profileList = this.profileList.concat(profileList)
          resolve(results)
        })
        .catch(error => {
          console.error(error)
          reject(error)
        })
    })
  }

  parseProfiles (profiles) {
    let profileList = []
    profiles.forEach((p) => {
      let profile = {
        'token': p['$']['token'],
        'name': p['Name'],
        'snapshot': '',
        'stream': {
          'udp': '',
          'http': '',
          'rtsp': ''
        },
        'video': {
          'source': null,
          'encoder': null
        },
        'audio': {
          'source': null,
          'encoder': null
        },
        'ptz': {
          'range': {
            'x': {
              'min': 0,
              'max': 0
            },
            'y': {
              'min': 0,
              'max': 0
            },
            'z': {
              'min': 0,
              'max': 0
            }
          }
        }
      }

      if (p['VideoSourceConfiguration']) {
        profile['video']['source'] = {
          'token': p['VideoSourceConfiguration']['$']['token'],
          'name': p['VideoSourceConfiguration']['Name'],
          'bounds': {
            'width': parseInt(p['VideoSourceConfiguration']['Bounds']['$']['width'], 10),
            'height': parseInt(p['VideoSourceConfiguration']['Bounds']['$']['height'], 10),
            'x': parseInt(p['VideoSourceConfiguration']['Bounds']['$']['x'], 10),
            'y': parseInt(p['VideoSourceConfiguration']['Bounds']['$']['y'], 10)
          }
        }
      }
      if (p['VideoEncoderConfiguration']) {
        profile['video']['encoder'] = {
          'token': p['VideoEncoderConfiguration']['$']['token'],
          'name': p['VideoEncoderConfiguration']['Name'],
          'resolution': {
            'width': parseInt(p['VideoEncoderConfiguration']['Resolution']['Width'], 10),
            'height': parseInt(p['VideoEncoderConfiguration']['Resolution']['Height'], 10)
          },
          'quality': parseInt(p['VideoEncoderConfiguration']['Quality'], 10),
          'framerate': parseInt(p['VideoEncoderConfiguration']['RateControl']['FrameRateLimit'], 10),
          'bitrate': parseInt(p['VideoEncoderConfiguration']['RateControl']['BitrateLimit'], 10),
          'encoding': p['VideoEncoderConfiguration']['Encoding']
        }
      }
      if (p['AudioSourceConfiguration']) {
        profile['audio']['source'] = {
          'token': p['AudioSourceConfiguration']['$']['token'],
          'name': p['AudioSourceConfiguration']['Name']
        }
      }
      if (p['AudioEncoderConfiguration']) {
        profile['audio']['encoder'] = {
          'token': ('$' in p['AudioEncoderConfiguration']) ? p['AudioEncoderConfiguration']['$']['token'] : '',
          'name': p['AudioEncoderConfiguration']['Name'],
          'bitrate': parseInt(p['AudioEncoderConfiguration']['Bitrate'], 10),
          'samplerate': parseInt(p['AudioEncoderConfiguration']['SampleRate'], 10),
          'encoding': p['AudioEncoderConfiguration']['Encoding']
        }
      }
      if (p['PTZConfiguration']) {
        try {
          let r = p['PTZConfiguration']['PanTiltLimits']['Range']
          let xr = r['XRange']
          let x = profile['ptz']['range']['x']
          x['min'] = parseFloat(xr['Min'])
          x['max'] = parseFloat(xr['Max'])
        }
        catch (e) {}
        try {
          let r = p['PTZConfiguration']['PanTiltLimits']['Range']
          let yr = r['YRange']
          let y = profile['ptz']['range']['y']
          y['min'] = parseFloat(yr['Min'])
          y['max'] = parseFloat(yr['Max'])
        }
        catch (e) {}
        try {
          let r = p['PTZConfiguration']['ZoomLimits']['Range']
          let zr = r['XRange']
          let z = profile['ptz']['range']['z']
          z['min'] = parseFloat(zr['Min'])
          z['max'] = parseFloat(zr['Max'])
        }
        catch (e) {}
      }

      profileList.push(profile)
      if (!this.defaultProfile) {
        this.defaultProfile = profile
        if (this.ptz) {
          this.ptz.setProfileToken(profile.token)
        }
      }
    })

    return profileList
  }

  /**
   * Returns an array of profiles. Available after connection.
   * The profiles will contain media stream URIs and snapshot URIs for each profile.
  */
  getProfiles () {
    return this.profileList
  }

  mediaGetStreamURI () {
    return new Promise((resolve, reject) => {
      let protocols = ['UDP', 'HTTP', 'RTSP']
      let profileIndex = 0
      let protocolIndex = 0
      let getStreamUri = () => {
        let profile = this.profileList[profileIndex]
        if (profile) {
          let protocol = protocols[protocolIndex]
          if (protocol) {
            let token = profile['token']
            this.media.getStreamUri(protocol, token)
              .then(results => {
                let uri = results['data']['GetStreamUriResponse']['MediaUri']['Uri']
                this.profileList[profileIndex]['stream'][protocol.toLowerCase()] = uri
                ++protocolIndex
                getStreamUri()
              })
              .catch(error => {
                console.error(error)
                ++protocolIndex
                getStreamUri()
              })
          }
          else {
            ++profileIndex
            protocolIndex = 0
            getStreamUri()
          }
        }
        else {
          resolve()
        }
      }
      getStreamUri()
    })
  }

  mediaGetSnapshotUri () {
    return new Promise((resolve, reject) => {
      let profileIndex = 0
      let getSnapshotUri = () => {
        let profile = this.profileList[profileIndex]
        if (profile) {
          this.media.getSnapshotUri(profile['token'])
            .then(results => {
              try {
                profile['snapshot'] = results['data']['GetSnapshotUriResponse']['MediaUri']['Uri']
              }
              catch (e) {}
              ++profileIndex
              getSnapshotUri()
            })
            .catch(error => {
              console.error(error)
              ++profileIndex
              getSnapshotUri()
            })
        }
        else {
          resolve()
        }
      }
      getSnapshotUri()
    })
  }
}

module.exports = new Camera()