import type { Block, Member, Transaction } from '@/types';

export const initialBlocks: Block[] = [
    {
        name: 'Block 1',
        clusters: [
            { name: 'A', members: [] },
            { name: 'B', members: [] },
            { name: 'C', members: [] },
            { name: 'D', members: [] },
        ]
    }
];

export const initialMembers: Member[] = [];
