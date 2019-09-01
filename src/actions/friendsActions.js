import { fetchLLSD } from './llsd'

import { getFolderForAssetType } from '../selectors/inventory'
import { getNames, getDisplayNamesURL } from '../selectors/names'
import { getFriends, getFriendById } from '../selectors/people'
import { getAgentId, getSessionId } from '../selectors/session'

import { AssetType } from '../types/inventory'

function sendUUIDNameRequest (ids) {
  return (dispatch, getState, { circuit }) => {
    if (ids.length === 0) return

    circuit.send('UUIDNameRequest', {
      UUIDNameBlock: ids.map(id => {
        return {
          ID: id.toString()
        }
      })
    }, true)
  }
}

function loadDisplayNames (idsArray) {
  const ids = idsArray.map(id => id.toString())
  return (dispatch, getState) => {
    if (ids.length === 0) return

    const fetchUrlString = getDisplayNamesURL(getState())
    if (fetchUrlString.length === 0) return // Not jet loaded

    const fetchUrl = new window.URL(fetchUrlString)
    ids.forEach(id => fetchUrl.searchParams.append('ids', id))

    dispatch({
      type: 'DisplayNamesStartLoading',
      ids
    })

    fetchLLSD('GET', fetchUrl.href).then(result => {
      const badIDs = result['bad_ids'] || []
      dispatch(sendUUIDNameRequest(badIDs)) // Try again

      dispatch({
        type: 'DisplayNamesLoaded',
        agents: result.agents,
        badIDs,
        badNames: result['bad_usernames'] || []
      })
    })
  }
}

export function getDisplayName () {
  return (dispatch, getState) => {
    const names = getNames(getState())

    const toLoad = Object.keys(names).filter(id => !names[id].willHaveDisplayName())

    if (toLoad.length > 0) {
      dispatch(loadDisplayNames(toLoad))
    }
  }
}

export function getAllFriendsDisplayNames () {
  return (dispatch, getState) => {
    const state = getState()

    const names = getNames(state)
    const friendsIds = getFriends(state)
      .map(friend => friend.id)
      .concat([getAgentId(state)]) // Add self
      .filter(id => !(id in names) || !names[id].willHaveDisplayName()) // unknown only

    dispatch(loadDisplayNames(friendsIds))
  }
}

// Server answers with a ChangeUserRights Packet
export function updateRights (friendUUID, changedRights) {
  const id = friendUUID.toString()
  return (dispatch, getState, { circuit }) => {
    const state = getState()

    // Get friend
    const friend = getFriendById(state, id)
    if (friend == null) return

    const getRight = name => changedRights[name] == null
      ? friend.rightsGiven[name]
      : changedRights[name]

    // Get and combine rights
    const canSeeOnline = getRight('canSeeOnline')
    const canSeeOnMap = getRight('canSeeOnMap')
    const canModifyObjects = getRight('canModifyObjects')

    const rightsInt = (canSeeOnline << 0) | (canSeeOnMap << 1) | (canModifyObjects << 2)

    circuit.send('GrantUserRights', {
      AgentData: [
        {
          AgentID: getAgentId(state),
          SessionID: getSessionId(state)
        }
      ],
      Rights: [
        {
          AgentRelated: id,
          RelatedRights: rightsInt
        }
      ]
    }, true)
  }
}

export function acceptFriendshipOffer (agentId, sessionId) {
  return (dispatch, getState, { circuit }) => {
    const state = getState()

    circuit.send('AcceptFriendship', {
      AgentData: [
        {
          AgentID: getAgentId(state),
          SessionID: getSessionId(state)
        }
      ],
      TransactionBlock: [
        { TransactionID: sessionId }
      ],
      FolderData: [
        {
          FolderID: getFolderForAssetType(state, AssetType.CallingCard).folderId
        }
      ]
    }, true)

    dispatch({
      type: 'FRIENDSHIP_ACCEPTED',
      agentId
    })
  }
}

export function declineFriendshipOffer (agentId, sessionId) {
  return (dispatch, getState, { circuit }) => {
    const state = getState()

    circuit.send('DeclineFriendship', {
      AgentData: [
        {
          AgentID: getAgentId(state),
          SessionID: getSessionId(state)
        }
      ],
      TransactionBlock: [
        { TransactionID: sessionId }
      ]
    }, true)

    dispatch({
      type: 'FRIENDSHIP_DECLINED',
      agentId
    })
  }
}

/**
 * Send a Teleport offer to an avatar.
 * @param {string} target UUID of the avatar that the offer should be send to.
 * @param {string?} message Optional message to be displayed.
 */
export function offerTeleportLure (target, message = null) {
  return (dispatch, getState, { circuit }) => {
    const activeState = getState()

    const text = message || 'Join me'

    circuit.send('StartLure', {
      AgentData: [
        {
          AgentID: getAgentId(activeState),
          SessionID: getSessionId(activeState)
        }
      ],
      Info: [
        {
          LureType: 0,
          Message: text
        }
      ],
      TargetData: [
        {
          TargetID: target
        }
      ]
    }, true)
  }
}
