package com.arshx.workstation;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "ArshxZipSaver")
public class ArshxZipSaverPlugin extends Plugin {
    private byte[] pendingZipBytes;

    @PluginMethod
    public void saveZip(PluginCall call) {
        if (pendingZipBytes != null) {
            call.reject("A ZIP save operation is already in progress.");
            return;
        }

        String filename = call.getString("filename");
        String data = call.getString("data");

        if (filename == null || filename.trim().isEmpty()
                || data == null || data.isEmpty()) {
            call.reject("A filename and ZIP data are required.");
            return;
        }

        try {
            pendingZipBytes = Base64.decode(data, Base64.DEFAULT);

            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/zip");
            intent.putExtra(Intent.EXTRA_TITLE, filename);

            startActivityForResult(call, intent, "saveZipResult");
        } catch (Exception e) {
            pendingZipBytes = null;
            call.reject("Could not open the Android Save As dialog.", e);
        }
    }

    @ActivityCallback
    private void saveZipResult(PluginCall call, ActivityResult result) {
        byte[] zipBytes = pendingZipBytes;
        pendingZipBytes = null;

        if (call == null) {
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK
                || result.getData() == null
                || result.getData().getData() == null) {
            JSObject response = new JSObject();
            response.put("saved", false);
            response.put("canceled", true);
            call.resolve(response);
            return;
        }

        Uri destination = result.getData().getData();

        if (zipBytes == null) {
            call.reject("ZIP data was lost. Please try saving again.");
            return;
        }

        try (OutputStream output =
                     getContext().getContentResolver().openOutputStream(destination, "w")) {
            if (output == null) {
                call.reject("Android could not open the selected destination.");
                return;
            }

            output.write(zipBytes);
            output.flush();

            JSObject response = new JSObject();
            response.put("saved", true);
            response.put("canceled", false);
            call.resolve(response);
        } catch (Exception e) {
            call.reject("Could not write the ZIP to the selected location.", e);
        }
    }
}
