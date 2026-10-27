// Adapted from shadcn/ui (MIT); see THIRD_PARTY_NOTICES.md.
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../../lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
	className,
	align = 'start',
	sideOffset = 5,
	container,
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & { container?: HTMLElement | null }) {
	return (
		<PopoverPrimitive.Portal container={container}>
			<PopoverPrimitive.Content data-slot="popover-content" align={align} sideOffset={sideOffset} className={cn('popover-content', className)} {...props} />
		</PopoverPrimitive.Portal>
	);
}
