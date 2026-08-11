import React from 'react';
import { Link } from 'react-router-dom';
import { isSketchfabConnected } from '../utils/sketchfabAuth';
import { isSketchfabAsset } from '../utils/assetUrls';
import './AssetLoadHelpBanner.css';

function AssetLoadHelpBanner({ object, failed = false }) {
    if (!failed || object?.type !== 'asset') return null;

    const sketchfabAsset = isSketchfabAsset(object);
    const sketchfabConnected = isSketchfabConnected();

    return (
        <div className="asset-load-help-banner" role="alert">
            <p className="asset-load-help-title">This asset is not displaying correctly.</p>
            {sketchfabAsset || !object.assetUrl?.trim() ? (
                <>
                    <p className="asset-load-help-copy">
                        {sketchfabConnected
                            ? 'If this model came from Sketchfab, your connection may have expired or the file may be missing. Reconnect Sketchfab in Settings, then re-import the model from Library.'
                            : 'If this model came from Sketchfab, connect your account in Settings, then re-import it from the Library Sketchfab tab.'}
                    </p>
                    <div className="asset-load-help-actions">
                        <Link to="/settings" className="btn btn-secondary btn-sm">
                            Sketchfab settings
                        </Link>
                        <Link to="/library" className="btn btn-ghost btn-sm">
                            Open Library
                        </Link>
                    </div>
                </>
            ) : (
                <>
                    <p className="asset-load-help-copy">
                        Check that the asset URL is valid and accessible. If it came from Sketchfab,
                        make sure your account is connected in Settings and try re-importing from Library.
                    </p>
                    <div className="asset-load-help-actions">
                        <Link to="/settings" className="btn btn-secondary btn-sm">
                            Sketchfab settings
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}

export default AssetLoadHelpBanner;
