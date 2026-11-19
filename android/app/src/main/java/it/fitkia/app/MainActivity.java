package it.fitkia.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // A tutto schermo su ogni versione di Android: barra di stato e di navigazione trasparenti, gestite dal plugin SystemBars di
        // Capacitor (vedi capacitor.config.json). Da Android 15 lo fa già il sistema; questa riga porta lo stesso aspetto alle versioni
        // precedenti. Va chiamata PRIMA di super.onCreate (indicazione della documentazione di Capacitor 8).
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
