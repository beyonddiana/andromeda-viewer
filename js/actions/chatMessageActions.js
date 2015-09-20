'use strict';

/*
 * Sends a message to the server.
 */

var session = require('../session.js');

module.exports = {
  sendLocalChatMessage: function (text, type, channel) {
    // Sends messages from the localchat
    // No UI update, because the server/sim will send it
    session.getActiveCircuit().send('ChatFromViewer', {
      AgentData: [
        {
          AgentID: session.getAgentId(),
          SessionID: session.getSessionId()
        }
      ],
      ChatData: [
        {
          Message: text,
          Type: type,
          Channel: channel
        }
      ]
    });
  },

  sendInstantMessage: function (text, to) {
    try {
      session.getActiveCircuit().send('ImprovedInstantMessage', {
        AgentData: [
          {
            AgentID: session.getAgentId(),
            SessionID: session.getSessionId()
          }
        ],
        MessageBlock: [
          {
            FromGroup: false,
            ToAgentID: to,
            ParentEstateID: session.getParentEstateID(),
            RegionID: session.getRegionID(),
            Position: session.getPosition(),
            Offline: 0,
            Dialog: 0,
            ID: session.getSessionId(),
            Timestamp: Math.floor(Date.now() / 1000),
            FromAgentName: session.getAvatarName().getFullName(),
            Message: text,
            BinaryBucket: new Buffer([0])
          }
        ]
      });
    } catch (e) {
      console.error(e);
    }
  }
};
