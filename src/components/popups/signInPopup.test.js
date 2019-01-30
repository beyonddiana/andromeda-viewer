import { axe } from 'jest-axe'
import React from 'react'
import { shallow, mount } from 'enzyme'

import SignInPopup from './signInPopup'

test('renders without crashing', () => {
  shallow(
    <SignInPopup onCancel={() => {}} isSignUp onSend={() => {}} />
  )

  shallow(
    <SignInPopup onCancel={() => {}} onSend={() => {}} />
  )
})

test('renders different with isSignUp', () => {
  const signUp = mount(<SignInPopup onCancel={() => {}} isSignUp onSend={() => {}} />)

  const signIn = mount(<SignInPopup onCancel={() => {}} onSend={() => {}} />)

  expect(signUp.find('Popup').prop('title')).toBe('Sign up')
  expect(signUp.find('input').length).toBe(5)

  expect(signIn.find('Popup').prop('title')).toBe('Sign in')
  expect(signIn.find('.password2').length).toBe(0)

  ;[signUp, signIn].forEach((popup, index) => {
    const buttons = popup.find('button')

    expect(buttons.length).toBe(3)
    expect(buttons.at(1).text()).toBe('cancel')
    expect(buttons.last().text()).toBe(index === 0 ? 'sign up' : 'sign in')
  })
})

test('click actions', () => {
  let cancelCallCount = 0
  let sendCallCount = 0
  let shouldCallSend = false

  const onSend = (username, password, cryptoPassword, type, ...rest) => {
    expect(shouldCallSend).toBe(true)
    expect(username).toBe('testery.mactestface@example.com')
    expect(password).toBe('secret')
    expect(cryptoPassword).toBe('encrypted')
    expect(rest.length).toBe(0)

    sendCallCount += 1
  }

  const onCancel = event => {
    cancelCallCount += 1
  }

  const signUp = mount(<SignInPopup
    onCancel={onCancel}
    isSignUp
    onSend={onSend}
  />)

  const signIn = mount(<SignInPopup
    onCancel={onCancel}
    onSend={onSend}
  />)

  ;[signUp, signIn].forEach((popup, index) => {
    const isSignUp = index === 0

    popup.find('button').at(1).simulate('click')
    popup.find('button.closePopup').simulate('click', {
      preventDefault: () => {}
    })

    popup.find('button').last().simulate('click')

    popup.find('input[type="email"]').simulate('change', {
      target: {
        value: 'testery.mactestface@example.com',
        validity: {
          valid: true
        },
        id: 'username'
      }
    })

    popup.find('button').last().simulate('click')

    const passwordInputs = popup.find('input[type="password"]')
    const addPassword = (aInput, key, password) => {
      aInput.simulate('change', {
        target: {
          value: password,
          id: key
        }
      })
    }
    addPassword(passwordInputs.first(), 'password', 'secret')
    addPassword(passwordInputs.at(2), 'cryptoPassword', 'encrypted')
    if (isSignUp) {
      popup.find('button').last().simulate('click')
      addPassword(passwordInputs.at(1), 'password2', 'secret')
      addPassword(passwordInputs.at(3), 'cryptoPassword2', 'encrypted')
    }

    shouldCallSend = true
    popup.find('button').last().simulate('click')
  })

  expect(cancelCallCount).toBe(4)
  expect(sendCallCount).toBe(2)
})

test('should pass aXe', async () => {
  const renderedSignUp = mount(<SignInPopup onCancel={() => {}} isSignUp onSend={() => {}} />)
  expect(await axe(renderedSignUp.html())).toHaveNoViolations()

  const renderedSignIn = mount(<SignInPopup onCancel={() => {}} onSend={() => {}} />)
  expect(await axe(renderedSignIn.html())).toHaveNoViolations()
})
