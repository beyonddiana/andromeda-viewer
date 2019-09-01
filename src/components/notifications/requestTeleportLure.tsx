import React from 'react'

import { Container, Text } from './utils'

import { RequestTeleportLureNotification } from '../../types/chat'

import formStyles from '../formElements.module.css'
import styles from './notifications.module.css'

interface NotificationArgs {
  data: RequestTeleportLureNotification
  onAccept: (target: string) => void
  onClose: () => void
}

export default function RequestTeleportLure ({
  data,
  onAccept,
  onClose
}: NotificationArgs) {
  return <Container
    title={data.fromAgentName + ' is requesting to be teleported to your location.'}
  >
    <Text text={data.text} />

    <div className={styles.ButtonsRow}>
      <button
        className={formStyles.OkButton}
        onClick={() => {
          onAccept(data.fromId)
          onClose()
        }}
      >
        Accept
      </button>

      <button className={formStyles.DangerButton} onClick={onClose}>
        Decline
      </button>
    </div>
  </Container>
}
