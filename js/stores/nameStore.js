'use strict'

/*
 * Stores the names of avatars
 */

var Store = require('flux/utils').Store

var Dispatcher = require('../uiDispatcher')
var session = require('../session')
var AvatarName = require('../avatarName')

var names = {}

setTimeout(function () {
  names[session.getAgentId()] = session.getAvatarName()
}, 50)

// Only adds a Name to names if it is new or did change
function addName (uuid, nameString) {
  if (nameString instanceof Uint8Array || nameString instanceof Buffer) {
    nameString = fromCharArrayToString(nameString)
  }
  if (!names[uuid] || !names[uuid].compare(nameString)) {
    names[uuid] = new AvatarName(nameString)
    return true
  } else {
    return false
  }
}

// Adds the names of the sending Avatar/Agent from IMs
function addNameFromIM (msg) {
  if (msg.MessageBlock.data[0].Dialog.value === 9) {
    return
  }
  var id = msg.AgentData.data[0].AgentID.value
  var name = msg.MessageBlock.data[0].FromAgentName.value
  return addName(id, name)
}

// Adds the names of the sending Avatar/Agent from the local Chat
function addNameFromLocalChat (msg) {
  if (msg.SourceType.value === 1) {
    var id = msg.SourceID.value
    var name = msg.FromName.value
    return addName(id, name)
  }
  return false
}

function addNameFromUUIDName (msg) {
  const didChangeArray = msg.UUIDNameBlock.data.map((nameBlock) => {
    const firstName = nameBlock.FirstName.value.toString()
    const lastName = nameBlock.LastName.value.toString()
    const name = firstName + ' ' + lastName
    return addName(nameBlock.ID.value, name)
  })
  return didChangeArray.some((did) => did) // Did some name change?
}

var nameStore = new Store(Dispatcher)
nameStore.__onDispatch = function (payload) {
  var didChange = false
  switch (payload.actionType) {
    case 'ChatFromSimulator':
      didChange = addNameFromLocalChat(payload.ChatData.data[0])
      break
    case 'ImprovedInstantMessage':
      didChange = addNameFromIM(payload)
      break
    case 'UUIDNameReply':
      didChange = addNameFromUUIDName(payload)
      break
  }
  if (didChange) {
    this.__emitChange()
  }
}
nameStore.hasNameOf = function (uuid) {
  return names[uuid] != null
}
// Gets the name of an Avatar/Agent
// id there is no name for that ID it will return an empty string
nameStore.getNameOf = function (uuid) {
  if (names[uuid]) {
    return names[uuid]
  } else {
    return ''
  }
}
nameStore.getNames = function () {
  var list = []
  for (var uuid in names) {
    if (names.hasOwnProperty(uuid)) {
      list.push(names[uuid].getFullName())
    }
  }
  return list
}

function fromCharArrayToString (buffer) {
  var str = buffer.toString()
  return str.substring(0, str.length - 1)
}

module.exports = nameStore
