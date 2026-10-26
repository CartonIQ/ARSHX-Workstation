package com.arshx.workstation;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ShellPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
