# Component specification

Displays floating content anchored to a trigger element. Popovers are used for dropdown menus, form overlays, and contextual actions that require more space than a tooltip.

- **Component Name:** PongPopover
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/pong-Design-System-V3?node-id=252-3284&m=dev)
- **Reka UI Component:** [Popover](https://reka-ui.com/docs/components/popover)

## Public API Definition

**Props**

- `open?: boolean` - Controlled visibility state. Supports two-way binding via `v-model:open`.
- `side?: 'top' | 'right' | 'bottom' | 'left'` - Which side of the trigger to position the popover. Default: `undefined` (auto)
- `align?: 'start' | 'center' | 'end'` - Alignment along the side axis. Default: `undefined` (auto)
- `sideOffset?: number` - Offset from the trigger element in pixels. Default: `5`
- `sideFlip?: boolean` - Whether to flip to opposite side if insufficient space.
- `width?: string` - Popover width (e.g., `'304px'`, `'auto'`).
- `maxHeight?: string` - Maximum height for scrollable content.
- `contentClass?: string` - Custom CSS class name for the popover content element.
- `teleported?: boolean` - Whether to append the popover to the body element. Default: `true`
- `showArrow?: boolean` - Whether to show the arrow pointing to the trigger. Default: `false`
- `enableScrolling?: boolean` - Whether to enable built-in scroll area. Default: `true`
- `enableSlideIn?: boolean` - Whether to enable slide-in animation. Default: `true`
- `scrollType?: 'auto' | 'always' | 'scroll' | 'hover'` - Scrollbar visibility behavior. Default: `'hover'`
- `suppressAutoFocus?: boolean` - Whether to suppress auto-focus when opened. Default: `false`
- `zIndex?: number` - z-index of popover content. Default: `999`
- `reference?: Element` - Custom reference element for positioning.
- `hideWhenDetached?: boolean` - Whether to hide the popover while its reference is hidden or fully outside the viewport. A scroll container that clips the reference does not count. Default: `false`

**Events**

- `update:open` - Emitted when visibility changes. Payload: `boolean`. Used with `v-model:open`.
- `before-enter` - Emitted before the popover enter animation starts.
- `after-leave` - Emitted after the popover leave animation completes.

**Slots**

- `trigger` - The trigger element that activates the popover (required).
- `content` - The popover content. Receives `{ close: () => void }` scope for programmatic closing.

### Template usage example

**Basic click popover:**

```vue
<script setup lang="ts">
import { PongPopover, PongButton } from '@pong/design-system'
</script>

<template>
  <PongPopover side="bottom" width="200px">
    <template #trigger>
      <PongButton label="Open menu" />
    </template>
    <template #content>
      <div class="menu-content">
        <p>Popover content here</p>
      </div>
    </template>
  </PongPopover>
</template>
```

**Controlled visibility with v-model:**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { PongPopover, PongButton } from '@pong/design-system'

const isOpen = ref(false)
</script>

<template>
  <PongPopover
    v-model:open="isOpen"
    side="top"
    width="304px"
  >
    <template #trigger>
      <PongButton label="Toggle popover" />
    </template>
    <template #content>
      <div class="popover-content">
        <p>Controlled popover content</p>
        <PongButton label="Close" @click="isOpen = false" />
      </div>
    </template>
  </PongPopover>
</template>
```

**With custom styling:**

```vue
<script setup lang="ts">
import { PongPopover, PongIconButton } from '@pong/design-system'
</script>

<template>
  <PongPopover
    side="top"
    content-class="custom-popover"
    width="208px"
  >
    <template #trigger>
      <PongIconButton icon="palette" />
    </template>
    <template #content>
      <div class="color-picker">
        <!-- Color picker content -->
      </div>
    </template>
  </PongPopover>
</template>
```

**With arrow and alignment:**

```vue
<script setup lang="ts">
import { PongPopover } from '@pong/design-system'
</script>

<template>
  <PongPopover
    side="right"
    align="start"
    show-arrow
    :side-offset="8"
    width="auto"
  >
    <template #trigger>
      <span class="submenu-trigger">Options</span>
    </template>
    <template #content>
      <ul class="submenu-options">
        <li>Option 1</li>
        <li>Option 2</li>
      </ul>
    </template>
  </PongPopover>
</template>
```

**Non-teleported (stays in DOM hierarchy):**

```vue
<script setup lang="ts">
import { PongPopover } from '@pong/design-system'
</script>

<template>
  <div class="dropdown-container">
    <PongPopover
      side="bottom"
      :teleported="false"
      width="300px"
    >
      <template #trigger>
        <input type="text" placeholder="Search..." />
      </template>
      <template #content>
        <div class="search-results">
          <!-- Results rendered in same DOM context -->
        </div>
      </template>
    </PongPopover>
  </div>
</template>
```

**Using close function from slot scope:**

```vue
<script setup lang="ts">
import { PongPopover, PongButton } from '@pong/design-system'

const handleAction = () => {
  // Do something
}
</script>

<template>
  <PongPopover side="bottom" width="250px">
    <template #trigger>
      <PongButton label="Actions" />
    </template>
    <template #content="{ close }">
      <div class="action-menu">
        <button @click="handleAction(); close()">
          Perform action and close
        </button>
      </div>
    </template>
  </PongPopover>
</template>
```

**With scrollable content:**

```vue
<script setup lang="ts">
import { PongPopover } from '@pong/design-system'
</script>

<template>
  <PongPopover
    side="bottom"
    width="300px"
    max-height="200px"
    scroll-type="auto"
  >
    <template #trigger>
      <span>Show list</span>
    </template>
    <template #content>
      <ul class="long-list">
        <!-- Many items that will scroll -->
      </ul>
    </template>
  </PongPopover>
</template>
```

**With animation lifecycle events:**

```vue
<script setup lang="ts">
import { PongPopover } from '@pong/design-system'

const onBeforeEnter = () => {
  console.log('Popover is about to appear')
}

const onAfterLeave = () => {
  console.log('Popover has fully closed')
}
</script>

<template>
  <PongPopover
    side="top"
    @before-enter="onBeforeEnter"
    @after-leave="onAfterLeave"
  >
    <template #trigger>
      <span>Click me</span>
    </template>
    <template #content>
      <div>Animated popover</div>
    </template>
  </PongPopover>
</template>
```

**Without auto-focus (useful for inputs):**

```vue
<script setup lang="ts">
import { PongPopover } from '@pong/design-system'
</script>

<template>
  <PongPopover
    side="bottom"
    :suppress-auto-focus="true"
  >
    <template #trigger>
      <input type="text" placeholder="Type here..." />
    </template>
    <template #content>
      <div class="suggestions">
        <!-- Suggestions list -->
      </div>
    </template>
  </PongPopover>
</template>
```
