# Component specification

Displays short text or icons to represent status, categories, or counts. Badges help users quickly identify important information through visual indicators without cluttering the interface.

- **Component Name:** PongBadge
- **Figma Component:** TBD
- **Current Implementation:** Custom component (no Element+ dependency)
- **Reka UI Component:** N/A (Reka UI does not provide a Badge primitive)
- **Nuxt UI Reference:** [Badge](https://ui.nuxt.com/docs/components/badge) (custom implementation, not based on Reka UI)

## Public API Definition

**Props**

- `theme?: BadgeTheme` - Visual style variant for the badge. Values: `'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary' | 'tertiary'`. Default: `'default'`
  - `default`: Subtle border badge with neutral styling
  - `success`: Green indicator for positive states
  - `warning`: Yellow/orange indicator for cautionary states
  - `danger`: Red indicator for error or critical states
  - `info`: Blue indicator for informational states
  - `primary`: Filled badge with contrasting text (pill-shaped)
  - `secondary`: Filled badge with tinted background
  - `tertiary`: Minimal badge variant with reduced padding
- `size?: TextSize` - Size of the badge text. Values: `'xsmall' | 'small' | 'mini' | 'medium' | 'large' | 'xlarge'`. Default: `'small'`
- `bold?: boolean` - Whether to render text in bold weight. Default: `false`
- `showBorder?: boolean` - Whether to show the badge border. Default: `true`

**Slots**

- `default` - Badge content (text, icons, or mixed content). Wrapped in PongText component for consistent typography.

### Template usage examples

**Simple text badge:**
```typescript
<script setup lang="ts">
import { PongBadge } from '@pong/design-system'
</script>

<template>
  <PongBadge theme="default">
    Read Only
  </PongBadge>
</template>
```

**Status indicators:**
```typescript
<script setup lang="ts">
import { PongBadge } from '@pong/design-system'
import { computed } from 'vue'

const status = ref<'success' | 'warning' | 'danger'>('success')

const statusTheme = computed(() => {
  const themeMap = {
    success: 'success',
    warning: 'warning',
    danger: 'danger',
  }
  return themeMap[status.value]
})
</script>

<template>
  <PongBadge :theme="statusTheme">
    {{ status }}
  </PongBadge>
</template>
```

**Count badge (primary theme):**
```typescript
<script setup lang="ts">
import { PongBadge } from '@pong/design-system'

const filterCount = ref(5)
</script>

<template>
  <PongBadge theme="primary">
    {{ filterCount }}
  </PongBadge>
</template>
```

**Tertiary minimal label:**
```typescript
<script setup lang="ts">
import { PongBadge } from '@pong/design-system'
</script>

<template>
  <PongBadge theme="tertiary" :bold="true">
    Pending
  </PongBadge>
</template>
```

**Badge with icon and text:**
```typescript
<script setup lang="ts">
import { PongBadge } from '@pong/design-system'
import ProjectIcon from './ProjectIcon.vue'

const projectBadge = {
  icon: 'project',
  text: 'Team Project'
}
</script>

<template>
  <PongBadge
    theme="tertiary"
    :show-border="false"
  >
    <ProjectIcon :icon="projectBadge.icon" size="mini" />
    <span>{{ projectBadge.text }}</span>
  </PongBadge>
</template>
```

**Multiple sizes:**
```typescript
<script setup lang="ts">
import { PongBadge } from '@pong/design-system'
</script>

<template>
  <PongBadge theme="primary" size="xsmall">XS</PongBadge>
  <PongBadge theme="primary" size="small">Small</PongBadge>
  <PongBadge theme="primary" size="medium">Medium</PongBadge>
</template>
```

**With custom CSS classes:**
```typescript
<script setup lang="ts">
import { PongBadge } from '@pong/design-system'
</script>

<template>
  <PongBadge class="ml-3xs" theme="warning" :bold="true">
    Action Required
  </PongBadge>
</template>
```

**Conditional rendering:**
```typescript
<script setup lang="ts">
import { PongBadge } from '@pong/design-system'

const isReadOnly = ref(true)
const needsSetup = ref(false)
</script>

<template>
  <PongBadge v-if="isReadOnly" theme="tertiary" :bold="true">
    Read Only
  </PongBadge>

  <PongBadge v-if="needsSetup" theme="warning">
    Setup Required
  </PongBadge>
</template>
```

**With inline styles (advanced):**
```typescript
<script setup lang="ts">
import { PongBadge } from '@pong/design-system'
</script>

<template>
  <PongBadge
    theme="warning"
    style="height: 25px"
  >
    Custom Height
  </PongBadge>
</template>
```

**Dynamic theme binding:**
```typescript
<script setup lang="ts">
import { PongBadge } from '@pong/design-system'
import type { BadgeTheme } from '@pong/design-system/types'

interface FileStatus {
  status: 'completed' | 'pending' | 'failed'
}

const file = ref<FileStatus>({ status: 'completed' })

const getStatusTheme = (status: string): BadgeTheme => {
  const themeMap: Record<string, BadgeTheme> = {
    completed: 'success',
    pending: 'warning',
    failed: 'danger',
  }
  return themeMap[status] || 'default'
}

const statusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    completed: 'Completed',
    pending: 'Pending',
    failed: 'Failed',
  }
  return labelMap[status] || status
}
</script>

<template>
  <PongBadge :theme="getStatusTheme(file.status)">
    {{ statusLabel(file.status) }}
  </PongBadge>
</template>
```
