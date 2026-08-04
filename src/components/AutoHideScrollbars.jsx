import { useEffect } from 'react';
import { observeAutoHideScrollbars } from '../utils/autoHideScrollbar';

export default function AutoHideScrollbars() {
    useEffect(() => observeAutoHideScrollbars(document.body), []);
    return null;
}
