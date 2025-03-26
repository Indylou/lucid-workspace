import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

interface MentionListProps {
  items: Array<{
    id: string
    name: string
    avatar_url?: string
  }>
  command: (item: any) => void
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({
        id: item.id,
        label: item.name,
        avatar: item.avatar_url,
      })
    }
  }

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length
    )
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  return (
    <div className="mention-list rounded-lg border bg-popover p-1 shadow-md">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            className={`
              flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm
              ${index === selectedIndex ? 'bg-accent text-accent-foreground' : ''}
            `}
            key={item.id}
            onClick={() => selectItem(index)}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={item.avatar_url} />
              <AvatarFallback>{item.name[0]}</AvatarFallback>
            </Avatar>
            <span>{item.name}</span>
          </button>
        ))
      ) : (
        <div className="px-2 py-1 text-sm text-muted-foreground">
          No users found
        </div>
      )}
    </div>
  )
})

MentionList.displayName = 'MentionList' 