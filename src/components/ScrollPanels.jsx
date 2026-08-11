import { useEffect } from 'react';
import { observeScrollPanels } from '../utils/scrollPanel';

export default function ScrollPanels() {
    useEffect(() => observeScrollPanels(document.body), []);
    return null;
}
