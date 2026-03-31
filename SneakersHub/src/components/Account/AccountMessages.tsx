import React, { memo } from "react";
import MessagesInbox from "@/components/MessagesInbox";

const AccountMessages = memo(() => <MessagesInbox />);
AccountMessages.displayName = "AccountMessages";
export default AccountMessages;