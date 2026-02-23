package ai.agdi.android.ui

import androidx.compose.runtime.Composable
import ai.agdi.android.MainViewModel
import ai.agdi.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
