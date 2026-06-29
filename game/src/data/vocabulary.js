export const VOCABULARY = [
    { id: 'listen', char: '听', temp: 'warm' },
    { id: 'slow', char: '慢', temp: 'warm' },
    { id: 'true', char: '真', temp: 'warm' },
    { id: 'ask', char: '问', temp: 'warm' },
    { id: 'light', char: '光', temp: 'warm' },
    { id: 'road', char: '路', temp: 'neutral' },
    { id: 'fire', char: '火', temp: 'warm' },
    { id: 'open', char: '开', temp: 'neutral' },
    { id: 'real', char: '实', temp: 'neutral' },
    { id: 'quiet', char: '静', temp: 'cool' },
    { id: 'wake', char: '醒', temp: 'cool' },
    { id: 'blue', char: '蓝', temp: 'cool' },
    { id: 'safe', char: '安', temp: 'warm' },
    { id: 'I', char: '我', temp: 'warm' }
];

export function getWord(id) {
    return VOCABULARY.find(w => w.id === id);
}
