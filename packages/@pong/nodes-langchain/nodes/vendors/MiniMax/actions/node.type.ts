import type { AllEntities } from 'pong-workflow';

type NodeMap = {
	text: 'message';
	image: 'generate';
	video: 'textToVideo' | 'imageToVideo';
	audio: 'textToSpeech';
};

export type MiniMaxType = AllEntities<NodeMap>;
