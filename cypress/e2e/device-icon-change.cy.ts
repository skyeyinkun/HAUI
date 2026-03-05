describe('Device management icon change', () => {
  it('updates mdi icon and persists after reload', () => {
    const token = 'x'.repeat(32)
    const devices = [
      {
        id: 1001,
        entity_id: 'light.test_light',
        name: '测试灯',
        icon: 'mdi:account',
        count: '1',
        power: '0',
        isOn: false,
        room: '客厅',
        type: 'light',
        category: 'lighting',
        haAvailable: true,
      },
    ]

    cy.intercept('GET', '/ha-api/api/states', [
      {
        entity_id: 'light.test_light',
        state: 'off',
        last_changed: new Date().toISOString(),
        attributes: { friendly_name: '测试灯' },
      },
    ])

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('ha_devices', JSON.stringify(devices))
        win.localStorage.setItem('ha_config', JSON.stringify({ localUrl: '', publicUrl: '', token }))
      },
    })

    cy.get('button[aria-label="打开系统设置"]').click()
    cy.contains('设备管理').click()

    cy.contains('测试灯').should('exist')
    cy.contains('button', '编辑').click()

    cy.contains('更换图标').click()
    cy.get('input[placeholder^="搜索图标"]').clear().type('home')
    cy.get('button[title="mdi:home"]').first().click()
    cy.contains('button', '确认').should('not.be.disabled').click()

    cy.contains('保存更改').click()
    cy.contains('button', '保存配置').click()
    cy.contains('button', '保存成功', { timeout: 10000 }).should('exist')

    cy.window().should((win) => {
      const saved = JSON.parse(win.localStorage.getItem('ha_devices') || '[]')
      expect(saved[0].icon).to.eq('mdi:home')
    })

    cy.reload()

    cy.get('button[aria-label="打开系统设置"]').click()
    cy.contains('设备管理').click()

    cy.window().should((win) => {
      const saved = JSON.parse(win.localStorage.getItem('ha_devices') || '[]')
      expect(saved[0].icon).to.eq('mdi:home')
    })
  })
})
